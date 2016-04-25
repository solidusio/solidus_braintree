require 'spec_helper'

describe Spree::Order, type: :model do
  let(:order) { Spree::Order.new}
  let(:creditcard) { Spree::CreditCard.new }

  it "has a device_data accessor" do
    expect { order.device_data = 'abc123' }.not_to raise_error
    expect(order.device_data).to eq("abc123")
  end

  it "passes device_data to the source of associated unprocessed payments" do
    order.device_data = 'abc123'
    order.payments << Spree::Payment.new(state: 'checkout', source: creditcard, device_data: nil)
    order.unprocessed_payments

    payment = order.payments.first
    payment = expect(payment.source.device_data).to eq('abc123')
  end
end
