source "https://rubygems.org"

branch = ENV.fetch('SOLIDUS_BRANCH', 'master')
gem "solidus", github: "solidusio/solidus", branch: branch
gem "solidus_support", github: "solidusio/solidus_support"

gem "rails", "~> 5.1.0"
gem 'rails-controller-testing', '~> 1.0', '>= 1.0.4', group: :test

case ENV['DB']
when 'mysql'
  gem 'mysql2', '~> 0.4.10'
when 'postgres'
  gem 'pg', '~> 0.21'
end

group :development, :test do
  if branch < "v2.5"
    gem 'factory_bot', '4.10.0'
  else
    gem 'factory_bot', '> 4.10.0'
  end

  gem 'pry-rails', '~> 0.3.9'
end

gemspec
