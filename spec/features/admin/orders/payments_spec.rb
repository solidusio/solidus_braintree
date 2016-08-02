require 'spec_helper'

describe 'payments', type: :feature do
  stub_authorization!

  let(:order) { create(:order) }
  let!(:gateway) { create_braintree_payment_method }

  it 'allows you to create a new credit card' do
    visit spree.admin_order_payments_path(order)
    choose('Use a new card')
  end
end
