# frozen_string_literal: true

require 'bundler/gem_tasks'
require 'solidus_dev_support/rake_tasks'
SolidusDevSupport::RakeTasks.install(user_class: "Spree::User")

task :default do
  require 'bundler'
  Bundler.with_unbundled_env do
    sh 'bin/rspec'
  end
end

CLOBBER.include('dummy-app')
CLOBBER.include('sandbox')
