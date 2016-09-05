source "https://rubygems.org"

branch = ENV.fetch('SOLIDUS_BRANCH', 'master')
gem "solidus", github: "solidusio/solidus", branch: branch

if branch == 'master' || branch >= "v2.0"
  gem "rails-controller-testing", group: :test
end

gem 'pg'
gem 'mysql2'

group :development do
  gem 'listen'
end

group :development, :test do
  gem "pry-rails"
end

gemspec
