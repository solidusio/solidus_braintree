require 'spec_helper'

describe Spree::PermittedAttributes do
  it "payment_attributes includes :payment_method_nonce" do
    expect(Spree::PermittedAttributes.payment_attributes).to include(:payment_method_nonce)
  end
end
