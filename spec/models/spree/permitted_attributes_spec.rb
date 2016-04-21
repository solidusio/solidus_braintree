require 'spec_helper'

describe Spree::PermittedAttributes do
  it "payment_attributes includes :payment_method_nonce" do
    expect(Spree::PermittedAttributes.payment_attributes).to include(:payment_method_nonce)
  end

  it 'checkout_attributes includes :device_data' do
    expect(Spree::PermittedAttributes.checkout_attributes).to include(:braintree_device_data)
  end
end
