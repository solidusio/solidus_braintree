require "bundler/gem_tasks"
require "rspec/core/rake_task"
require 'spree/testing_support/common_rake'

RSpec::Core::RakeTask.new(:spec)

Bundler::GemHelper.install_tasks

task default: :spec

desc "Generates a dummy app for testing"
task :test_app do
  ENV['LIB_NAME'] = 'solidus_braintree'
  Rake::Task['common:test_app'].invoke
end
