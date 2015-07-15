require "braintree"

module Solidus
  class Gateway::BraintreeGateway < ::Spree::Gateway
    preference :environment, :string
    preference :merchant_id, :string
    preference :public_key, :string
    preference :private_key, :string

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
      'Visa' => 'visa'
    }

    ENVIRONMENTS = {
      'development' => :sandbox,
      'qa' => :sandbox,
      'sandbox' => :sandbox,
      'production' => :production
    }

    def gateway_options
      {
        environment: ENVIRONMENTS.fetch(preferred_environment),
        merchant_id: preferred_merchant_id,
        public_key: preferred_public_key,
        private_key: preferred_private_key,
        logger: ::Braintree::Configuration.logger.clone
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

    def create_profile_from_nonce(user, address, nonce, options = {})
      params = {
        first_name: address.firstname,
        last_name: address.lastname,
        email: user.email,
        credit_card: {
          billing_address: map_address(address),
          payment_method_nonce: nonce,
          options: {
            verify_card: true
          },
        }
      }

      params.merge!(options)

      result = braintree_gateway.customer.create(params)

      if result.success?
        card = result.customer.payment_methods.last

        user.credit_cards.create! do |spree_cc|
          if card.is_a?(::Braintree::PayPalAccount)
            spree_cc.cc_type = 'paypal'
            spree_cc.name = card.email
          else
            spree_cc.name = "#{address.firstname} #{address.lastname}"
            spree_cc.cc_type = card.card_type.downcase
            spree_cc.month = card.expiration_month
            spree_cc.year = card.expiration_year
            spree_cc.last_digits = card.last_4
          end
          spree_cc.payment_method = self
          spree_cc.gateway_customer_profile_id = customer_id(user)
          spree_cc.gateway_payment_profile_id = card.token
        end
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

    def authorize(cents, creditcard, options)
      result = braintree_gateway.transaction.sale(transaction_authorize_or_purchase_params(cents, creditcard, options))
      handle_result(result)
    end

    def purchase(cents, creditcard, options)
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
    def customer_id(user)
      "user_#{user.id}"
    end

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

    def handle_result(result)
      ActiveMerchant::Billing::Response.new(
        result.success?,
        message_from_result(result),
        {},
        { authorization: (result.transaction.id if result.success?) }
      )
    end

    def map_address(addr)
      {
        first_name: addr.firstname,
        last_name: addr.lastname,
        street_address: addr.address1,
        extended_address: addr.address2,
        company: addr.company,
        locality: addr.city,
        region: addr.state ? addr.state.name : addr.state_name,
        country_code_alpha3: addr.country.iso3,
        postal_code: addr.zipcode
      }
    end

    def amount(cents)
      sprintf("%.2f", cents.to_f / 100)
    end

    def transaction_authorize_or_purchase_params(cents, creditcard, options = {})
      params = options.select {|k| %i[
        billing
        billing_address_id
        channel
        custom_fields
        customer
        customer_id
        descriptor
        device_data
        device_session_id
        merchant_account_id
        options
        order_id
        purchase_order_number
        recurring
        service_fee_amount
        shipping
        shipping_address_id
        tax_amount
        tax_exempt
      ].include?(k)}

      params[:options] ||= {}

      params[:amount] = amount(cents)

      if params[:payment_method_nonce].nil?
        params[:payment_method_token] = creditcard.gateway_payment_profile_id
        params.delete(:billing_address)
      end

      # if has profile, set the customer_id to the profile_id and delete the customer key
      if creditcard.respond_to?(:gateway_customer_profile_id) && creditcard.gateway_customer_profile_id
        params[:customer_id] = creditcard.gateway_customer_profile_id
        params.delete(:customer)
      # if no profile, define the customer key, delete the customer_id because they are
      # mutually exclusive
      else
        params[:customer] = {
          id: params[:customer_id],
          email: options[:customer],
          first_name: creditcard.first_name,
          last_name: creditcard.last_name,
        }
        params.delete(:customer_id)
      end

      # delete the shipping price in options
      params.delete(:shipping)

      # if there's a shipping_address/billing_address, set it to the shipping/billing key
      # and convert the address into a format Braintree understands
      if params[:shipping_address]
        params[:shipping] = map_address(params.delete(:shipping_address))
      end
      if params[:billing_address]
        params[:billing] = map_address(params.delete(:billing_address))
      end

      params[:channel] ||= "Spree"

      params
    end
  end
end
