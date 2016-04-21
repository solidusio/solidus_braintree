require 'spec_helper'

describe Spree::Payment, type: :model do
  let(:payment) { Spree::Payment.new }
  it "has a payment_method_nonce accessor" do
    expect { payment.payment_method_nonce = "abc123" }.not_to raise_error
    expect(payment.payment_method_nonce).to eq("abc123")
  end
end
