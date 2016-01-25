require 'spec_helper'

describe Solidus::Gateway::BraintreeGateway, :vcr do
  let(:payment_method){ create_braintree_payment_method }
  let(:user){ FactoryGirl.create :user }
  # #create_profile doesn't support options, does it need to?
  # let(:device_data){'{"name":"device_data","value":"{\"device_session_id\":\"d99cb85002cc4ac9e9a23c4a79d943ea\",\"fraud_merchant_id\":\"600000\",\"correlation_id\":\"c3c1356c70a3565af86e9add0d09315f\"}"}'}

  let(:payment) do
    FactoryGirl.create(:payment,
      order: FactoryGirl.create(:order,
        user: user,
      ),
      source: FactoryGirl.create(:credit_card,
        name: "Card Holder",
        user: user,
      ),
      payment_method: payment_method,
      payment_method_nonce: nonce,
    )
  end
  let(:card) { payment.source }

  context 'a customer profile' do
    let(:nonce){ Braintree::Test::Nonce::Transactable }

    context 'with a user with an invalid_email' do
      before do
        user.email = "quux@foo_bar.com"
        user.save!
      end

      it "fails" do
        expect{
          payment_method.create_profile(payment)
        }.to raise_error(Spree::Core::GatewayError, 'Email is an invalid format.')
      end
    end

    context "with a valid credit card" do
      before do
        payment_method.create_profile(payment)
      end

      context "visa" do
        it "should have the correct attributes" do
          expect(card.user).to eq user
          expect(card.payment_method).to eq payment_method
          expect(card.cc_type).to eq 'visa'
          expect(card.last_digits).to eq '1881'
          expect(card.name).to eq "Card Holder"

          expect(card.month).to eq '12'
          expect(card.year).to eq '2020'

          expect(card.gateway_payment_profile_id).to be_present
          expect(card.gateway_customer_profile_id).to be_present
        end
      end

      context "amex" do
        let(:nonce) { "fake-valid-amex-nonce"}

        it "should have the correct attributes" do
          expect(card.user).to eq user
          expect(card.payment_method).to eq payment_method
          expect(card.cc_type).to eq 'american_express'
          expect(card.last_digits).to eq '0005'
          expect(card.name).to eq "Card Holder"

          expect(card.month).to eq '12'
          expect(card.year).to eq '2020'

          expect(card.gateway_payment_profile_id).to be_present
          expect(card.gateway_customer_profile_id).to be_present
        end
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
          expect(capture.avs_result["code"]).to eq "M"
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
      expect(card.email).to eq 'jane.doe@example.com'

      expect(card.gateway_payment_profile_id).to be_present
      expect(card.gateway_customer_profile_id).to be_present
    end

    it "succeeds authorization and capture" do
      card.gateway_customer_profile_id = nil
      auth = payment_method.authorize(5000, card, {})
      expect(auth).to be_success
      expect(auth.authorization).to be_present
      expect(auth.avs_result["code"]).to eq "I"

      capture = payment_method.capture(5000, auth.authorization, {})
      expect(capture).to be_success
      expect(capture.authorization).to be_present
      expect(capture.avs_result["code"]).to eq "I"
    end

    it "succeeds capture on pending settlement" do
      auth = payment_method.authorize(400200, card, {})
      expect(auth).to be_success
      expect(auth.authorization).to be_present

      capture = payment_method.capture(400200, auth.authorization, {})
      expect(capture).to be_success

      expect(Spree::CreditCard.count).to eql(1)
      expect(Spree::CreditCard.first.gateway_payment_profile_id).to be_present
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

    it "credits a completed payment" do
      card.gateway_customer_profile_id = nil
      auth = payment_method.authorize(5000, card, {})
      expect(auth).to be_success
      capture = payment_method.capture(5000, auth.authorization, {})
      expect(capture).to be_success
      credit = payment_method.credit(5000, card, auth.authorization, {})
      expect(credit).to be_success
    end

    it "voids a authorized payment" do
      card.gateway_customer_profile_id = nil
      auth = payment_method.authorize(5000, card, {})
      expect(auth).to be_success
      void = payment_method.void(auth.authorization, card, {})
      expect(void).to be_success
    end
  end

  context 'on a payment' do
    context 'PayPal' do
      let(:nonce){ Braintree::Test::Nonce::PayPalFuturePayment }

      before do
        payment.source.gateway_customer_profile_id = nil
        payment.source.save!
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
      end

      context 'failure', transaction_clean: false do
        it "fails" do
          expect{
            payment.amount = 4001.00
            payment.capture!
          }.to raise_error(Spree::Core::GatewayError)
          expect(payment).to be_failed

          expect(Spree::CreditCard.count).to eql(1)
          expect(Spree::CreditCard.first.gateway_payment_profile_id).to be_present
        end
      end
    end
  end

  context "braintree attributes" do
    let(:nonce) { Braintree::Test::Nonce::Transactable }
    let(:creditcard) do
      FactoryGirl.create(:credit_card, gateway_payment_profile_id: 'abc123')
    end
    let(:address) { FactoryGirl.create(:address) }

    context "with a credit card" do
      let(:options) { {
        customer_id: user.id,
        shipping: "20.00",
        customer: user.email
      } }

      it "should send payment method token" do
        expected_params = {
          customer: {
            id: user.id,
            email: user.email,
            first_name: creditcard.first_name,
            last_name: creditcard.last_name
          },
          options: {},
          amount: "5.00",
          payment_method_token: 'abc123',
          channel: "Solidus"
        }

        expect(payment_method).to receive(:handle_result)
        expect_any_instance_of(::Braintree::TransactionGateway).to receive(:sale).with(expected_params)
        payment_method.authorize(500, creditcard, options)
      end

      context "with a payment method nonce" do
        let(:options) { {
          customer_id: user.id,
          payment_method_nonce: nonce,
          shipping: "20.00",
          customer: user.email
        } }

        it "should send a nonce" do
          expected_params = {
            customer: {
              id: user.id,
              email: user.email,
              first_name: creditcard.first_name,
              last_name: creditcard.last_name
            },
            options: {},
            amount: "5.00",
            payment_method_nonce: nonce,
            channel: "Solidus"
          }

          expect(payment_method).to receive(:handle_result)
          expect_any_instance_of(::Braintree::TransactionGateway).to receive(:sale).with(expected_params)
          payment_method.authorize(500, creditcard, options)
        end
      end

      context "with existing customer" do
        before { creditcard.update_attributes(gateway_customer_profile_id: 5) }
        let(:options) { {
          customer_id: user.id,
          payment_method_nonce: nonce,
          shipping: "20.00",
          customer: user.email
        } }

        it "should only send customer id" do
          expected_params = {
            customer_id: creditcard.gateway_customer_profile_id,
            options: {},
            amount: "5.00",
            payment_method_nonce: nonce,
            channel: "Solidus"
          }

          expect(payment_method).to receive(:handle_result)
          expect_any_instance_of(::Braintree::TransactionGateway).to receive(:sale).with(expected_params)
          payment_method.authorize(500, creditcard, options)
        end

        context 'when a billing address is provided' do
          let(:bill_address) do
            create(:address, address1: '1234 bill address')
          end

          let(:options) do
            {
              customer_id: user.id,
              billing_address: bill_address.active_merchant_hash,
            }
          end

          context 'when preferred_always_send_bill_address is true' do
            before do
              payment_method.update!(preferred_always_send_bill_address: true)
            end

            it 'sends a bill address' do
              expected_params = {
                billing: {
                  first_name: address.first_name,
                  last_name: address.last_name,
                  street_address: "1234 bill address",
                  extended_address: address.address2,
                  locality: address.city,
                  region: address.state_text,
                  country_code_alpha2: address.country.iso,
                  postal_code: address.zipcode,
                },
                customer_id: creditcard.gateway_customer_profile_id,
                payment_method_token: 'abc123',
                options: {},
                amount: "5.00",
                channel: "Solidus"
              }

              allow(payment_method).to receive(:handle_result)
              expect_any_instance_of(::Braintree::TransactionGateway).to receive(:sale).with(expected_params)
              payment_method.authorize(500, creditcard, options)
            end
          end

          context 'when preferred_always_send_bill_address is true' do
            before do
              payment_method.update!(preferred_always_send_bill_address: false)
            end

            it 'does not send a bill address' do
              expected_params = {
                customer_id: creditcard.gateway_customer_profile_id,
                payment_method_token: 'abc123',
                options: {},
                amount: "5.00",
                channel: "Solidus"
              }

              allow(payment_method).to receive(:handle_result)
              expect_any_instance_of(::Braintree::TransactionGateway).to receive(:sale).with(expected_params)
              payment_method.authorize(500, creditcard, options)
            end
          end

        end
      end

      context "with billing or shipping address" do
        before { creditcard.update_attributes(gateway_customer_profile_id: 5) }
        let(:options) { {
          customer_id: user.id,
          payment_method_nonce: nonce,
          shipping_address: address.active_merchant_hash,
          billing_address: address.active_merchant_hash,
          shipping: "20.00",
          customer: user.email
        } }

        it "should send billing and shipping address" do
          expected_params = {
            customer_id:  creditcard.gateway_customer_profile_id,
            options: {},
            amount: "5.00",
            shipping: {
              first_name: address.first_name,
              last_name: address.last_name,
              street_address: address.address1,
              extended_address: address.address2,
              locality: address.city,
              region: address.state_text,
              country_code_alpha2: address.country.iso,
              postal_code: address.zipcode,
            },
            billing: {
              first_name: address.first_name,
              last_name: address.last_name,
              street_address: address.address1,
              extended_address: address.address2,
              locality: address.city,
              region: address.state_text,
              country_code_alpha2: address.country.iso,
              postal_code: address.zipcode,
            },
            payment_method_nonce: nonce,
            channel: "Solidus"
          }

          expect(payment_method).to receive(:handle_result)
          expect_any_instance_of(::Braintree::TransactionGateway).to receive(:sale).with(expected_params)
          payment_method.authorize(500, creditcard, options)
        end
      end
    end

    context "first and last name splitting" do
      # since the address_hash comes from Spree::Address#active_merchant_hash which throws away
      # information by only giving a concatenated full name in the :name field, we have to do a best
      # guess here to split it back out. PayPal actually requires first_name and last_name on the
      # shipping address in order to provide seller protection. Having something there is better
      # than nothing.
      let(:mapped_address) { payment_method.send(:map_address, {name: name}) }

      context "simple 2 word name" do
        let(:name) { "Luke Skywalker" }

        it "splits" do
          address = mapped_address
          expect(address[:first_name]).to eq "Luke"
          expect(address[:last_name]).to eq "Skywalker"
        end
      end

      context "3 word name" do
        let(:name) { "Obi Wan Kenobi" }

        it "splits" do
          address = mapped_address
          expect(address[:first_name]).to eq "Obi Wan"
          expect(address[:last_name]).to eq "Kenobi"
        end
      end
    end
  end
end
