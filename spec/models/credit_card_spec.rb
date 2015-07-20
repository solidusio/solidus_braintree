require 'spec_helper'

describe Spree::CreditCard do
  context "payment is of type Solidus::Gateway::BraintreeGateway" do
    let(:payment_method) do
      Solidus::Gateway::BraintreeGateway.create!(
        name: 'Braintree Gateway',
        environment: 'sandbox',
        active: true
      )
    end
    let(:credit_card) do
      FactoryGirl.create(:credit_card,
        payment_method: payment_method,
        encrypted_data: nil,
        gateway_customer_profile_id: nil,
        gateway_payment_profile_id: nil
      )
    end

    it "require_card_numbers? returns false" do
      expect(credit_card.require_card_numbers?).not_to be
    end
  end
end
