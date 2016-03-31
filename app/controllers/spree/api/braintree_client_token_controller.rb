class Spree::Api::BraintreeClientTokenController < Spree::Api::BaseController
  skip_before_action :authenticate_user

  def create
    if params[:payment_method_id]
      gateway = Solidus::Gateway::BraintreeGateway.find_by!(id: params[:payment_method_id])
    else
      gateway = Solidus::Gateway::BraintreeGateway.find_by!(active: true)
    end

    render json: { client_token: gateway.generate_client_token, payment_method_id: gateway.id }
  end
end
