module SolidusBraintreeClientToken
  extend ActiveSupport::Concern

  def create
    respond_to do |format|
      format.json do
        render json: {
          client_token: generate_client_token,
          payment_method_id: gateway.id
        }
      end
    end
  end

  protected

  def gateway
    @gateway ||= if params[:payment_method_id]
      Solidus::Gateway::BraintreeGateway.find_by!(id: params[:payment_method_id])
    else
      Solidus::Gateway::BraintreeGateway.find_by!(active: true)
    end
  end

  def generate_client_token
    options = {}
    options[:customer_id] = customer_id if customer_id.present?

    gateway.generate_client_token(options)
  end

  def customer_id
    return unless try_spree_current_user
    try_spree_current_user.braintree_customer_id
  end
end
