# solidus_braintree

`solidus_braintree` is a gem that adds [Braintree v.zero](https://www.braintreepayments.com/v.zero) support to the [solidus](http://solidus.io/) E-commerce platform.

## Installation

Add this line to your solidus application's Gemfile:

```ruby
gem "solidus_braintree"
```

And then execute:

    $ bundle

## Usage

This gem extends your solidus application by adding a `POST /api/payment_client_token` endpoint to you application to generate Braintree payment client token. This endpoint requires an authentication token in your request header.

It also creates a new `PaymentMethod` class called `Solidus::Gateway::BraintreeGateway`. You can configure this payment method in the admin and add your Braintree public/private keys and merchant id. The admin will render a Braintree dropin container when prompting you to create an order payment.

## Development

After checking out the repo, run `bin/setup` to install dependencies. Then, run `rake rspec` to run the tests. You can also run `bin/console` for an interactive prompt that will allow you to experiment.

To install this gem onto your local machine, run `bundle exec rake install`. To release a new version, update the version number in `version.rb`, and then run `bundle exec rake release`, which will create a git tag for the version, push git commits and tags, and push the `.gem` file to [rubygems.org](https://rubygems.org).

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/solidusio/solidus_braintree.

## License

The gem is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
