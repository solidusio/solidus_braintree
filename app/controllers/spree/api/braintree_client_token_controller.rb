class Spree::Api::BraintreeClientTokenController < Spree::Api::BaseController
  def create
    gateway = Solidus::Gateway::BraintreeGateway.find_by!(active: true, environment: Rails.env)
    render json: { client_token: gateway.generate_client_token }
  end
end
