require 'spec_helper'

describe Spree::Api::BraintreeClientTokenController, :vcr, type: :controller do
  describe "POST create" do
    let(:current_api_user) do
      user = Spree.user_class.new(:email => "spree@example.com")
      user.generate_spree_api_key!
      user
    end

    context "with a payment method id" do
      before do
        gateway = create_braintree_payment_method
        post :create, params: { payment_method_id: gateway.id, token: current_api_user.spree_api_key }
      end

      it "returns an http success" do
        expect(response).to have_http_status(:success)
      end

      it "returns a content type of application/json" do
        expect(response.content_type).to eq("application/json")
      end

      it "returns a client_token" do
        body = JSON.parse(response.body)
        expect(body["client_token"]).to be_present
        expect(body["payment_method_id"]).to be_present
      end
    end

    context "without a payment method id" do
      before do
        create_braintree_payment_method
        post :create, params: { token: current_api_user.spree_api_key }
      end

      it "returns an http success" do
        expect(response).to have_http_status(:success)
      end

      it "returns a content type of application/json" do
        expect(response.content_type).to eq("application/json")
      end

      it "returns a client_token" do
        body = JSON.parse(response.body)
        expect(body["client_token"]).to be_present
        expect(body["payment_method_id"]).to be_present
      end
    end

    context "with an invalid authentication token" do
      before do
        gateway = create_braintree_payment_method
        post :create, params: { payment_method_id: gateway.id, token: 'invalid_token' }
      end

      it "returns an http 401 unauthorized" do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
