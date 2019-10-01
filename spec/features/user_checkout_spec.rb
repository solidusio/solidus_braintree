require 'spec_helper'
require 'spree/testing_support/order_walkthrough'

describe "Braintree checkout", :vcr, :js, type: :feature do
  let!(:user) { create(:user) }
  let!(:gateway) { create_braintree_payment_method }

  before(:each) do
    allow_any_instance_of(Spree::CheckoutController).to receive_messages(current_order: order)
    allow_any_instance_of(Spree::CheckoutController).to receive_messages(try_spree_current_user: user)
    allow_any_instance_of(Spree::OrdersController).to receive_messages(try_spree_current_user: user)
  end

  context 'registered user with existing credit card' do
    let!(:order) { OrderWalkthrough.up_to(:delivery) }
    let!(:exiting_credit_card) { create_credit_card }

    before(:each) do
      visit spree.checkout_state_path(:delivery)
    end

    it 'allow use of existing card' do
      click_on 'Save and Continue'

      expect(page).to have_content('Use an existing card on file')
      click_on 'Save and Continue'

      expect(page).to have_button('Place Order')
    end
  end

  def create_credit_card
    FactoryGirl.create(:credit_card,
                       user: user,
                       gateway_customer_profile_id: 'abc123')
  end
end
