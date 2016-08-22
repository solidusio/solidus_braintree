require "bundler/gem_tasks"
require "rspec/core/rake_task"
require 'spree/testing_support/extension_rake'

RSpec::Core::RakeTask.new(:spec)

Bundler::GemHelper.install_tasks

task :default do
  if Dir["spec/dummy"].empty?
    Rake::Task[:test_app].invoke
    Dir.chdir("../../")
  end
  Rake::Task[:spec].invoke
end

desc "Generates a dummy app for testing"
task :test_app do
  ENV['LIB_NAME'] = 'solidus_braintree'
  Rake::Task['extension:test_app'].invoke
end
