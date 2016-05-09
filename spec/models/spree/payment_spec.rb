require 'spec_helper'

describe Spree::Payment, type: :model do
  let(:device_data){"{\"device_session_id\":\"75197918b634416368241bb8996b560c\",\"fraud_merchant_id\":\"600000\"}"}

  it "has a payment_method_nonce accessor" do
    payment = Spree::Payment.new

    expect { payment.payment_method_nonce = "abc123" }.not_to raise_error
    expect(payment.payment_method_nonce).to eq("abc123")
  end

  it 'adds device_data from the associated order to gateway_options hash' do
    payment = create(:payment)

    payment.order.update_attribute(:braintree_device_data, device_data)
    expect(payment.gateway_options[:device_data]).to be_present
  end
end
