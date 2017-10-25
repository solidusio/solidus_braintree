require 'spec_helper'

describe Spree::CreditCard, type: :model do
  context "payment is of type Solidus::Gateway::BraintreeGateway" do
    let(:payment_method) do
      Solidus::Gateway::BraintreeGateway.create!(
        name: 'Braintree Gateway',
        active: true
      )
    end
    it "validate presence of name on create" do
      expect do
        FactoryBot.create(:credit_card,
          payment_method: payment_method,
          name: nil
        )
      end.to raise_error(ActiveRecord::RecordInvalid, /Name can't be blank/)
    end
  end
end
