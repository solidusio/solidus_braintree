require 'spec_helper'

RSpec.describe Spree::BraintreeClientTokenController, :vcr, type: :controller do
  describe "POST create" do
    let(:user) { FactoryBot.create(:user, braintree_customer_id: 'fake-customer-id') }

    context 'when user is logged in' do
      before do
        allow(controller).to receive(:try_spree_current_user).and_return(user)
      end

      it 'passes the braintree customer id when generating client token' do
        expect_any_instance_of(Solidus::Gateway::BraintreeGateway).to receive(:generate_client_token).
          with(hash_including(:customer_id))

        create_braintree_payment_method
        post :create, params: { format: :json }
      end
    end

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
