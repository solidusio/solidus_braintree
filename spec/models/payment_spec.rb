require 'spec_helper'

describe Spree::Payment do
  it "has a payment_method_nonce accessor" do
    payment = Spree::Payment.new
    expect { payment.payment_method_nonce = "abc123" }.not_to raise_error
    expect(payment.payment_method_nonce).to eq("abc123")
  end
end
