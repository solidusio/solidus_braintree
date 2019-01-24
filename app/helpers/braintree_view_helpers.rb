module BraintreeViewHelpers
  # Returns a link to the Braintree web UI for the given Braintree +payment_id+
  # (e.g. from Spree::Payment#response_code), or just the +payment_id+ if
  # Braintree's merchant ID is not configured or +payment_id+ is blank
  def braintree_transaction_link(payment_id)
    env = ENV['BRAINTREE_ENV'] == 'production' ? 'www' : 'sandbox'
    merchant = ENV['BRAINTREE_MERCHANT_ID']

    if payment_id.present? && merchant.present?
      link_to(
        payment_id,
        "https://#{env}.braintreegateway.com/merchants/#{merchant}/transactions/#{payment_id}",
        title: 'Show payment on Braintree',
        target: '_blank'
      )
    else
      payment_id
    end
  end

  ##
  # Generate a client token for a user
  # @return [String, NilClass]
  #
  def braintree_client_token_for(user = nil)
    options = {}
    options[:customer_id] = user.braintree_customer_id if user.present?

    braintree_gateway.generate_client_token(options)
  rescue => error
    Rails.logger.error(error)
    nil
  end

  private

  def braintree_gateway
    @gateway ||= if params[:payment_method_id]
      Solidus::Gateway::BraintreeGateway.find_by!(id: params[:payment_method_id])
    else
      Solidus::Gateway::BraintreeGateway.find_by!(active: true)
    end
  end
end
