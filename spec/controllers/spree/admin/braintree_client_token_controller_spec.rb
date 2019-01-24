require 'spec_helper'

RSpec.describe Spree::Admin::BraintreeClientTokenController, :vcr, type: :controller do
  stub_authorization!
  
  describe "POST create" do
    let(:user) { FactoryBot.create(:user, braintree_customer_id: 'fake-customer-id') }

    context "with a payment method id" do
      before do
        gateway = create_braintree_payment_method
        post :create, params: { format: :json, payment_method_id: gateway.id }
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
        post :create, params: { format: :json }
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
  end
end
