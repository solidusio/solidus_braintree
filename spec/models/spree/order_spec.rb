require 'spec_helper'

describe Spree::Order, type: :model do
  let(:order) { Spree::Order.new}

  it "has a braintree_device_data attribute" do
    expect { order.braintree_device_data = 'abc123' }.not_to raise_error
    expect(order.braintree_device_data).to eq("abc123")
  end
end
