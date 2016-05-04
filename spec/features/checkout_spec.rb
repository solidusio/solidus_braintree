require 'spec_helper'

describe "Braintree checkout", :vcr, :js, type: :feature do
  let!(:country) { create :country}
  let!(:zone) { create :zone }
  let!(:product) { create(:product, name: 'DL-44') }
  let!(:gateway) { create_braintree_payment_method }

  before do
    zone.members << Spree::ZoneMember.create!(zoneable: country)
    create(:store)
    create(:free_shipping_method)
  end

  it "accepts a CC payment" do
    using_wait_time(5) do
      visit "/products/#{product.slug}"
    end
    click_on 'Add To Cart'
    click_on 'Checkout'

    fill_in_address
    click_on 'Save and Continue'
    click_on 'Save and Continue'

    # Payment
    expect(page).to have_content(gateway.name)

    braintree_fill_in 'Card Number', with: '4111111111111111'
    braintree_fill_in 'Expiration', with: "12/20"
    braintree_fill_in 'Card Code', with: '123'

    click_on 'Save and Continue'

    # Previous step can take a long time, so we allow an extra delay
    click_on 'Place Order', wait: 30
    expect(page).to have_content('Your order has been processed successfully')

    # Assert the payment details were stored correctly
    order = Spree::Order.first
    expect(order).to be_complete
    expect(order.payments.count).to be(1)

    payment = order.payments.first
    expect(payment).to be_pending
    expect(payment.response_code).to be_present

    card = payment.source
    expect(card).to be_a(Spree::CreditCard)
    expect(card.year).to eq("2020")
    expect(card.month).to eq("12")
    expect(card.last_digits).to eq("1111")
    expect(card.cc_type).to eq("visa")
    expect(card.gateway_customer_profile_id).to be_present
    expect(card.gateway_payment_profile_id).to be_present
  end

  it "unsuccessful credit card verification" do
    using_wait_time(5) do
      visit "/products/#{product.slug}"
    end
    click_on 'Add To Cart'
    click_on 'Checkout'

    fill_in_address
    click_on 'Save and Continue'
    click_on 'Save and Continue'

    # Payment
    expect(page).to have_content(gateway.name)

    braintree_fill_in 'Card Number', with: '4000111111111115'
    braintree_fill_in 'Expiration', with: "12/20"
    braintree_fill_in 'Card Code', with: '123'

    click_on 'Save and Continue'
    expect(page).to have_content('Do Not Honor')
    expect(page).to_not have_content('Place Order')

    # Assert the payment details were not stored
    order = Spree::Order.first
    expect(order.state).to eq("payment")
    expect(order.payments.count).to be(0)
  end

  it "unsuccessful credit card transaction (amount >= 2000)" do
    product = create(:product, name: "Millenium Falcon", price: 2500.00, cost_price: 2000.00)
    using_wait_time(5) do
      visit "/products/#{product.slug}"
    end
    click_on 'Add To Cart'
    click_on 'Checkout'

    fill_in_address
    click_on 'Save and Continue'
    click_on 'Save and Continue'

    # Payment
    expect(page).to have_content(gateway.name)

    braintree_fill_in 'Card Number', with: '4111111111111111'
    braintree_fill_in 'Expiration', with: "12/20"
    braintree_fill_in 'Card Code', with: '123'

    click_on 'Save and Continue'
    click_on 'Place Order', wait: 30
    expect(page).to have_content('processor_declined')

    # Assert the order is not confirmed
    order = Spree::Order.first
    expect(order.state).to eq "payment"
    expect(order.payments.count).to be(1)

    # Assert payment failed (because of amount)
    payment = order.payments.first
    expect(payment).to be_failed

    # Assert payment details are saved even when processor fails
    card = payment.source
    expect(card).to be_a(Spree::CreditCard)
    expect(card.year).to eq("2020")
    expect(card.month).to eq("12")
    expect(card.last_digits).to eq("1111")
    expect(card.cc_type).to eq("visa")
    expect(card.gateway_customer_profile_id).to be_present
    expect(card.gateway_payment_profile_id).to be_present
  end

  it "denies a fraudulent card" do
    using_wait_time(5) do
      visit "/products/#{product.slug}"
    end
    click_on 'Add To Cart'
    click_on 'Checkout'

    fill_in_address
    click_on 'Save and Continue'
    click_on 'Save and Continue'

    # Payment
    expect(page).to have_content(gateway.name)

    braintree_fill_in 'Card Number', with: '4000111111111511'
    braintree_fill_in 'Expiration', with: "12/20"
    braintree_fill_in 'Card Code', with: '123'

    click_on 'Save and Continue'
    expect(page).to have_content('Gateway Rejected: fraud')
    expect(page).to_not have_content('Place Order')

    # Assert the payment details were not stored
    order = Spree::Order.first
    expect(order.state).to eq("payment")
    expect(order.payments.count).to be(0)
  end

  def fill_in_address
    fill_in "Customer E-Mail", with: "han@example.com"
    within("#billing") do
      fill_in "First Name", with: "Han"
      fill_in "Last Name", with: "Solo"
      fill_in "Street Address", with: "YT-1300"
      fill_in "City", with: "Mos Eisley"
      select country.name, from: "Country"
      select country.states.first, from: "order_bill_address_attributes_state_id"
      fill_in "Zip", with: "12010"
      fill_in "Phone", with: "(555) 555-5555"
    end
  end

  def braintree_fill_in(label_text, with:)
    label = find(:label, label_text)
    frame = find("##{label[:for]} iframe")
    within_frame(frame) do
      find('input').set(with)
    end
  end
end
