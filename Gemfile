source "https://rubygems.org"

branch = ENV.fetch('SOLIDUS_BRANCH', 'master')
gem "solidus", github: "solidusio/solidus", branch: branch

if branch == 'master' || branch >= "v2.3"
  gem "rails", "~> 5.1.0"
  gem "rails-controller-testing", group: :test
elsif branch >= "v2.0"
  gem "rails", "~> 5.0.0"
  gem "rails-controller-testing", group: :test
else
  gem "rails", "~> 4.2.0"
  gem "rails_test_params_backport", group: :test
end

case ENV['DB']
when 'mysql'
  gem 'mysql2'
when 'postgres'
  gem 'pg', '< 1.0'
end

group :development, :test do
  if branch < "v2.5"
    gem 'factory_bot', '4.10.0'
  else
    gem 'factory_bot', '> 4.10.0'
  end

  gem "pry-rails"
end

gemspec
