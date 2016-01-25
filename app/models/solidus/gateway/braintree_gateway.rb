require "braintree"

module Solidus
  class Gateway::BraintreeGateway < ::Spree::Gateway
    preference :environment, :string
    preference :merchant_id, :string
    preference :public_key, :string
    preference :private_key, :string
    preference :always_send_bill_address, :boolean, default: false

    CARD_TYPE_MAPPING = {
      'American Express' => 'american_express',
      'Diners Club' => 'diners_club',
      'Discover' => 'discover',
      'JCB' => 'jcb',
      'Laser' => 'laser',
      'Maestro' => 'maestro',
      'MasterCard' => 'master',
      'Solo' => 'solo',
      'Switch' => 'switch',
      'Visa' => 'visa',
    }

    def gateway_options
      {
        environment: preferred_environment.to_sym,
        merchant_id: preferred_merchant_id,
        public_key: preferred_public_key,
        private_key: preferred_private_key,
        logger: ::Braintree::Configuration.logger.clone,
      }
    end

    def braintree_gateway
      @braintree_gateway ||= ::Braintree::Gateway.new(gateway_options)
    end

    def payment_profiles_supported?
      true
    end

    def generate_client_token(options = {})
      braintree_gateway.client_token.generate(options)
    end

    def create_profile(payment)
      source = payment.source

      return if source.gateway_customer_profile_id.present? || payment.payment_method_nonce.nil?

      user = payment.order.user
      address = (payment.source.address || payment.order.bill_address).try(:active_merchant_hash)

      params = {
        first_name: source.first_name,
        last_name: source.last_name,
        email: user.email,
        credit_card: {
          cardholder_name: source.name,
          billing_address: map_address(address),
          payment_method_nonce: payment.payment_method_nonce,
          options: {
            verify_card: true,
          },
        },
      }

      result = braintree_gateway.customer.create(params)

      if result.success?
        card = result.customer.payment_methods.last
        source.tap do |solidus_cc|
          if card.is_a?(::Braintree::PayPalAccount)
            solidus_cc.cc_type = 'paypal'
            data = {
              email: card.email
            }
            solidus_cc.data = data.to_json
          else
            solidus_cc.name = card.cardholder_name
            solidus_cc.cc_type = CARD_TYPE_MAPPING[card.card_type]
            solidus_cc.month = card.expiration_month
            solidus_cc.year = card.expiration_year
            solidus_cc.last_digits = card.last_4
          end
          solidus_cc.payment_method = self
          solidus_cc.gateway_customer_profile_id = result.customer.id
          solidus_cc.gateway_payment_profile_id = card.token
        end
        source.save!
      else
        raise ::Spree::Core::GatewayError, result.message
      end
    end

    def supports?(payment)
      true
    end

    def provider_class
      self
    end

    def authorize(cents, creditcard, options = {})
      result = braintree_gateway.transaction.sale(transaction_authorize_or_purchase_params(cents, creditcard, options))
      handle_result(result)
    end

    def purchase(cents, creditcard, options = {})
      params = transaction_authorize_or_purchase_params(cents, creditcard, options)
      params[:options][:submit_for_settlement] = true
      result = braintree_gateway.transaction.sale(params)
      handle_result(result)
    end

    def capture(money, authorization_code, options = {})
      result = braintree_gateway.transaction.submit_for_settlement(authorization_code, amount(money))
      handle_result(result)
    end

    def void(authorization_code, source = {}, options = {})
      result = braintree_gateway.transaction.void(authorization_code)

      handle_result(result)
    end

    def credit(cents, source, authorization_code, options = {})
      result = braintree_gateway.transaction.refund(authorization_code, amount(cents))
      handle_result(result)
    end

    def voidable?(response_code)
      transaction = braintree_gateway.transaction.find(response_code)
      [
        ::Braintree::Transaction::Status::SubmittedForSettlement,
        ::Braintree::Transaction::Status::Authorized,
      ].include?(transaction.status)
    end

    private
    def message_from_result(result)
      if result.success?
        "OK"
      elsif result.errors.count == 0 && result.credit_card_verification
        "Processor declined: #{result.credit_card_verification.processor_response_text} (#{result.credit_card_verification.processor_response_code})"
      elsif result.errors.count == 0 && result.transaction
        result.transaction.status
      else
        result.errors.map { |e| "#{e.message} (#{e.code})" }.join(" ")
      end
    end

    def build_results_hash(result)
      {}.tap do |results_hash|
        results_hash.merge!({
          authorization: result.transaction.id,
          avs_result: { code: result.transaction.avs_street_address_response_code }
        }) if result.success?
      end
    end

    def handle_result(result)
      ActiveMerchant::Billing::Response.new(
        result.success?,
        message_from_result(result),
        {},
        build_results_hash(result)
      )
    end

    def map_address(addr)
      full_name = addr.fetch(:name, "")
      *first_name_parts, last_name = full_name.split(" ")
      first_name = first_name_parts.join(" ")
      last_name ||= ""

      {
        first_name: first_name,
        last_name: last_name,
        street_address: addr[:address1],
        extended_address: addr[:address2],
        locality: addr[:city],
        region: addr[:state],
        country_code_alpha2: addr[:country],
        postal_code: addr[:zip],
      }
    end

    def amount(cents)
      sprintf("%.2f", cents.to_f / 100)
    end

    def transaction_authorize_or_purchase_params(cents, creditcard, options = {})
      params = options.select {|k| %i[
        billing_address_id
        channel
        custom_fields
        descriptor
        device_data
        device_session_id
        merchant_account_id
        options
        order_id
        purchase_order_number
        recurring
        service_fee_amount
        shipping_address_id
        tax_amount
        tax_exempt
      ].include?(k)}

      params[:options] ||= {}
      params[:amount] = amount(cents)
      params[:channel] ||= "Solidus"
      params[:shipping] = map_address(options[:shipping_address]) if options[:shipping_address]

      if options[:payment_method_nonce]
        params[:payment_method_nonce] = options[:payment_method_nonce]
      else
        params[:payment_method_token] = creditcard.gateway_payment_profile_id
      end

      # Send the bill address if we're using a nonce (i.e. doing a one-time
      # payment) or if we're configured to always send the bill address
      if options[:payment_method_nonce] || preferred_always_send_bill_address
        params[:billing] = map_address(options[:billing_address]) if options[:billing_address]
      end

      # if has profile, set the customer_id to the profile_id and delete the customer key
      if creditcard.try(:gateway_customer_profile_id)
        params[:customer_id] = creditcard.gateway_customer_profile_id
      # if no profile, define the customer key, delete the customer_id because they are
      # mutually exclusive
      else
        params[:customer] = {
          id: options[:customer_id],
          email: options[:customer],
          first_name: creditcard.first_name,
          last_name: creditcard.last_name,
        }
      end

      params
    end
  end
end
