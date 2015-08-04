require 'spec_helper'

describe Spree::Api::BraintreeClientTokenController, :vcr, type: :controller do
  describe "POST create" do
    before do
      create_braintree_payment_method
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
      expect(body["payment_method_id"]).to be_present
    end
  end
end
