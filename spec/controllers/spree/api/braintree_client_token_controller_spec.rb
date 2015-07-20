require 'spec_helper'

describe Spree::Api::BraintreeClientTokenController, :vcr, type: :controller do
  before(:all) do
    @braintree_payment_method = Solidus::Gateway::BraintreeGateway.create!(
      name: 'Braintree Gateway',
      environment: 'development',
      active: true
    )
    @braintree_payment_method.set_preference(:environment, 'development')
    @braintree_payment_method.set_preference(:merchant_id, 'zbn5yzq9t7wmwx42')
    @braintree_payment_method.set_preference(:public_key,  'ym9djwqpkxbv3xzt')
    @braintree_payment_method.set_preference(:private_key, '4ghghkyp2yy6yqc8')
    @braintree_payment_method.save!
  end

  describe "POST create" do
    before do
      post :create
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
    end
  end
end
