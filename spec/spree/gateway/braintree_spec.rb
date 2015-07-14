require 'spec_helper'

describe Spree::Gateway::Braintree, :vcr do
  let(:payment_method){ @braintree_payment_method }
  let(:user){ FactoryGirl.create :user }
  let(:address){ FactoryGirl.create :address }
  let(:device_data){'{"name":"device_data","value":"{\"device_session_id\":\"d99cb85002cc4ac9e9a23c4a79d943ea\",\"fraud_merchant_id\":\"600000\",\"correlation_id\":\"c3c1356c70a3565af86e9add0d09315f\"}"}'}
  let(:card){ payment_method.create_profile_from_nonce(user, address, nonce, { device_data: device_data }) }

  before do
    @braintree_payment_method = Spree::Gateway::Braintree.create!(
      name: 'Braintree Gateway',
      environment: 'sandbox',
      active: true
    )
    @braintree_payment_method.set_preference(:environment, 'sandbox')
    @braintree_payment_method.set_preference(:merchant_id, 'zbn5yzq9t7wmwx42')
    @braintree_payment_method.set_preference(:public_key,  'ym9djwqpkxbv3xzt')
    @braintree_payment_method.set_preference(:private_key, '4ghghkyp2yy6yqc8')
    @braintree_payment_method.save!
  end

  context 'Credit Card' do
    let(:nonce){ Braintree::Test::Nonce::Transactable }
    it "should have the correct attributes" do
      expect(card.user).to eq user
      expect(card.payment_method).to eq payment_method
      expect(card.cc_type).to eq 'visa'
      expect(card.last_digits).to eq '1881'
      expect(card.name).to eq "#{address.firstname} #{address.lastname}"

      expect(card.month).to eq '12'
      expect(card.year).to eq '2020'

      expect(card.gateway_payment_profile_id).to be_present
      expect(card.gateway_customer_profile_id).to be_present
    end

    context 'successful' do
      it "succeeds" do
        card.gateway_customer_profile_id = nil
        auth = payment_method.authorize(5000, card, {})
        expect(auth).to be_success
        expect(auth.authorization).to be_present

        capture = payment_method.capture(5000, auth.authorization, {})
        expect(capture).to be_success
        expect(capture.authorization).to be_present
      end
    end

    context 'invalid_email' do
      before do
        user.email = "quux@foo_bar.com"
        user.save!
      end
      it "fails" do
        expect{
          card
        }.to raise_error(Spree::Core::GatewayError, 'Email is an invalid format.')
      end
    end

    context 'decline' do
      it "fails" do
        card.gateway_customer_profile_id = nil
        auth = payment_method.authorize(200100, card, {})
        expect(auth).to_not be_success
        expect(auth.message).to eq "processor_declined"
        expect(Spree::CreditCard.count).to eql(1)
        expect(Spree::CreditCard.first.gateway_payment_profile_id).to be_present
      end
    end

    context 'with completed payment' do
      let!(:auth) do
        card.gateway_customer_profile_id = nil
        payment_method.authorize(5000, card, {})
      end
      let(:auth_code){ auth.authorization }
      let!(:capture) do
        payment_method.capture(5000, auth_code, {})
      end

      it "can be fully credited" do
        credit = payment_method.credit(5000, card, auth_code, {})
        expect(credit).to_not be_success
        expect(credit.message).to eq "Cannot refund a transaction unless it is settled. (91506)"
      end

      it "can be voided" do
        void = payment_method.void(auth_code, card, {})
        expect(void).to be_success
      end
    end
  end

  context 'Previously consumed nonce' do
    let(:nonce){  Braintree::Test::Nonce::Consumed }
    it "should raise exception" do
      expect{
        card
      }.to raise_error(Spree::Core::GatewayError)
    end
  end

  context 'PayPal' do
    let(:nonce){ Braintree::Test::Nonce::PayPalFuturePayment }
    it "should have the correct attributes" do
      expect(card.user).to eq user
      expect(card.payment_method).to eq payment_method
      expect(card.cc_type).to eq 'paypal'
      expect(card.name).to eq 'jane.doe@example.com'

      expect(card.gateway_payment_profile_id).to be_present
      expect(card.gateway_customer_profile_id).to be_present
    end

    it "succeeds authorization and capture" do
      card.gateway_customer_profile_id = nil
      auth = payment_method.authorize(5000, card, {})
      expect(auth).to be_success
      expect(auth.authorization).to be_present

      capture = payment_method.capture(5000, auth.authorization, {})
      expect(capture).to be_success
      expect(capture.authorization).to be_present
    end

    it "fails capture with settlement declined" do
      card.gateway_customer_profile_id = nil
      auth = payment_method.authorize(400100, card, {})
      expect(auth).to be_success
      expect(auth.authorization).to be_present

      capture = payment_method.capture(400100, auth.authorization, {})
      expect(capture).to_not be_success
      expect(capture.message).to eq 'settlement_declined'

      expect(Spree::CreditCard.count).to eql(1)
      expect(Spree::CreditCard.first.gateway_payment_profile_id).to be_present
    end

    xit "fails capture on pending settlement" do
      auth = payment_method.authorize(400200, card, {})
      expect(auth).to be_success
      expect(auth.authorization).to be_present

      capture = payment_method.capture(400200, auth.authorization, {})
      expect(capture).to_not be_success
      expect(capture.message).to eq 'settlement_pending'

      expect(Spree::CreditCard.count).to eql(1)
      expect(Spree::CreditCard.first.gateway_payment_profile_id).to be_present
    end
  end

  context 'on a payment' do
    context 'PayPal' do
      let(:nonce){ Braintree::Test::Nonce::PayPalFuturePayment }
      let!(:payment) do
        card.gateway_customer_profile_id = nil
        FactoryGirl.create(:payment, payment_method: payment_method, source: card, amount: amount)
      end
      before do
        payment.payment_method.environment = Rails.env
        payment.authorize!
        expect(payment).to be_pending
        expect(payment.response_code).to be_present
      end
      context 'success' do
        let(:amount){ 50.00 }
        it "succeeds" do
          payment.capture!
          expect(payment).to be_completed
        end

        it "can be voided" do
          payment.capture!
          payment.void!
          expect(payment).to be_void
        end

        xit "can be refunded" do
          payment.capture!
          refund = payment.credit!(50.00)
          expect(refund.amount).to eq -50.00
          expect(refund).to be_completed
        end

        xit "errors on bad refund" do
          payment.capture!
          expect{
            payment.credit!(51.00)
          }.to raise_error(Spree::Core::GatewayError, 'Refund amount is too large. (91521)')
        end
      end
      context 'failure', transaction_clean: false do
        let(:amount){ 4001.00 }
        it "fails" do
          expect{
            payment.capture!
          }.to raise_error(Spree::Core::GatewayError)
          expect(payment).to be_failed

          expect(Spree::CreditCard.count).to eql(1)
          expect(Spree::CreditCard.first.gateway_payment_profile_id).to be_present
        end
      end
    end
  end
end
