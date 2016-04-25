require 'spec_helper'

describe Spree::CreditCard, type: :model do

  it "has a device_data accessor" do
    creditcard = Spree::CreditCard.new
    expect { creditcard.device_data = 'abc123' }.not_to raise_error
    expect(creditcard.device_data).to eq("abc123")
  end

  context "payment is of type Solidus::Gateway::BraintreeGateway" do
    let(:payment_method) do
      Solidus::Gateway::BraintreeGateway.create!(
        name: 'Braintree Gateway',
        active: true
      )
    end
    it "validate presence of name on create" do
      expect do
        FactoryGirl.create(:credit_card,
          payment_method: payment_method,
          name: nil
        )
      end.to raise_error(ActiveRecord::RecordInvalid, /Name can't be blank/)
    end
  end
end
