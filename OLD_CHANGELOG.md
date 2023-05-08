# Changelog

## [v3.0.0](https://github.com/solidusio/solidus_braintree/tree/v3.0.0) (2023-03-29)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v2.0.0...v3.0.0)

**Implemented enhancements:**

- Release SolidusBraintree 2.0.0 [\#130](https://github.com/solidusio/solidus_braintree/issues/130)

**Merged pull requests:**

- Fix: last version supporting SolidusFrontend should be 2.x [\#137](https://github.com/solidusio/solidus_braintree/pull/137) ([gsmendoza](https://github.com/gsmendoza))
- Fix: user should still be able to disable data collection in a SolidusBraintree hosted form [\#129](https://github.com/solidusio/solidus_braintree/pull/129) ([gsmendoza](https://github.com/gsmendoza))
- Improve SolidusBraintree README [\#125](https://github.com/solidusio/solidus_braintree/pull/125) ([gsmendoza](https://github.com/gsmendoza))
- Fix: deprecated version in warning should be 1.x instead of 0.x [\#118](https://github.com/solidusio/solidus_braintree/pull/118) ([gsmendoza](https://github.com/gsmendoza))
- Migrate database by default [\#117](https://github.com/solidusio/solidus_braintree/pull/117) ([gsmendoza](https://github.com/gsmendoza))
- Add device data collection [\#116](https://github.com/solidusio/solidus_braintree/pull/116) ([gsmendoza](https://github.com/gsmendoza))
- Update Solidus dependency to \>= 3.4.0.dev and \< 4 [\#114](https://github.com/solidusio/solidus_braintree/pull/114) ([gsmendoza](https://github.com/gsmendoza))
- Update SolidusBraintree InstallGenerator to install frontend code [\#112](https://github.com/solidusio/solidus_braintree/pull/112) ([gsmendoza](https://github.com/gsmendoza))
- Deep stringify the keys of the result params [\#111](https://github.com/solidusio/solidus_braintree/pull/111) ([gsmendoza](https://github.com/gsmendoza))
- Add Response to log entry permitted classes [\#109](https://github.com/solidusio/solidus_braintree/pull/109) ([gsmendoza](https://github.com/gsmendoza))
- Make Solidus Braintree compatible with Starter Frontend [\#102](https://github.com/solidusio/solidus_braintree/pull/102) ([gsmendoza](https://github.com/gsmendoza))
- Make migrations independent of existing models [\#100](https://github.com/solidusio/solidus_braintree/pull/100) ([elia](https://github.com/elia))
- Update the SolidusPaypalBraintree namespace to SolidusBraintree [\#99](https://github.com/solidusio/solidus_braintree/pull/99) ([gsmendoza](https://github.com/gsmendoza))
- Merge the history of Solidus PayPal Braintree into this repository [\#98](https://github.com/solidusio/solidus_braintree/pull/98) ([gsmendoza](https://github.com/gsmendoza))
- Add stale bot [\#89](https://github.com/solidusio/solidus_braintree/pull/89) ([gsmendoza](https://github.com/gsmendoza))
- Update to use forked solidus\_frontend when needed [\#88](https://github.com/solidusio/solidus_braintree/pull/88) ([waiting-for-dev](https://github.com/waiting-for-dev))
- Add deprecation notice to README [\#87](https://github.com/solidusio/solidus_braintree/pull/87) ([seand7565](https://github.com/seand7565))
- Adopt CircleCI instead of Travis [\#85](https://github.com/solidusio/solidus_braintree/pull/85) ([aldesantis](https://github.com/aldesantis))
- Suggest setting a value for environment preference [\#82](https://github.com/solidusio/solidus_braintree/pull/82) ([mdesantis](https://github.com/mdesantis))
- Test suite improvements [\#80](https://github.com/solidusio/solidus_braintree/pull/80) ([aitbw](https://github.com/aitbw))
- Extension maintenance [\#78](https://github.com/solidusio/solidus_braintree/pull/78) ([aitbw](https://github.com/aitbw))
- Fix references to Spree.t [\#77](https://github.com/solidusio/solidus_braintree/pull/77) ([skukx](https://github.com/skukx))
- Remove 2.2 from CI \(EOL\) [\#71](https://github.com/solidusio/solidus_braintree/pull/71) ([jacobherrington](https://github.com/jacobherrington))
- Fix Travis issue with Solidus old versions \(Factory Bot gem\) [\#70](https://github.com/solidusio/solidus_braintree/pull/70) ([spaghetticode](https://github.com/spaghetticode))
- Remove versions past EOL from .travis.yml [\#69](https://github.com/solidusio/solidus_braintree/pull/69) ([jacobherrington](https://github.com/jacobherrington))
- Add Solidus 2.7 to .travis.yml [\#68](https://github.com/solidusio/solidus_braintree/pull/68) ([jacobherrington](https://github.com/jacobherrington))

## [v2.0.0](https://github.com/solidusio/solidus_braintree/tree/v2.0.0) (2023-03-17)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v1.2.0...v2.0.0)

**Implemented enhancements:**

- Backport SolidusBraintree README changes to v2.x [\#131](https://github.com/solidusio/solidus_braintree/issues/131)
- Release SolidusBraintree 1.3 [\#127](https://github.com/solidusio/solidus_braintree/issues/127)
- Add overview to SolidusBraintree README [\#123](https://github.com/solidusio/solidus_braintree/issues/123)
- Add device data collection [\#115](https://github.com/solidusio/solidus_braintree/issues/115)
- Set Solidus dependency of SolidusBraintree to `> 3.4.0.dev, < 4` [\#113](https://github.com/solidusio/solidus_braintree/issues/113)
- Port device data collection from 1.x to 2.x [\#107](https://github.com/solidusio/solidus_braintree/issues/107)
- Support PayPal through frontend [\#26](https://github.com/solidusio/solidus_braintree/issues/26)

**Fixed bugs:**

- Fix: user should still be able to disable data collection in a SolidusBraintree hosted form [\#126](https://github.com/solidusio/solidus_braintree/issues/126)
- Fix Spree::LogEntry::DisallowedClass error for failed responses [\#110](https://github.com/solidusio/solidus_braintree/issues/110)
- Fix Spree::LogEntry::DisallowedClass error [\#108](https://github.com/solidusio/solidus_braintree/issues/108)

**Closed issues:**

- Fix: last version supporting SolidusFrontend should be 2.x instead of 1.x [\#136](https://github.com/solidusio/solidus_braintree/issues/136)
- Test SolidusBraintree SSF update with Venmo Pay [\#106](https://github.com/solidusio/solidus_braintree/issues/106)
- Update SolidusBraintree InstallGenerator to install frontend code [\#104](https://github.com/solidusio/solidus_braintree/issues/104)
- Release SolidusBraintree 1.3.0 [\#97](https://github.com/solidusio/solidus_braintree/issues/97)
- Update the SolidusPaypalBraintree namespace to SolidusBraintree [\#96](https://github.com/solidusio/solidus_braintree/issues/96)
- Merge the history of Solidus PayPal Braintree into this repository [\#92](https://github.com/solidusio/solidus_braintree/issues/92)
- Make Solidus Braintree compatible with Starter Frontend [\#91](https://github.com/solidusio/solidus_braintree/issues/91)
- Merge with `solidus_paypal_braintree` [\#90](https://github.com/solidusio/solidus_braintree/issues/90)
- Fix Deprecation warnings for use of Spree.t [\#76](https://github.com/solidusio/solidus_braintree/issues/76)
- New VCR specs with paypal fail [\#75](https://github.com/solidusio/solidus_braintree/issues/75)
- Drop-in Ui [\#73](https://github.com/solidusio/solidus_braintree/issues/73)
- Configure Solidus Braintree with Paypal  Braintree SDK Token [\#67](https://github.com/solidusio/solidus_braintree/issues/67)
- Authenticate the payment client token endpoint [\#66](https://github.com/solidusio/solidus_braintree/issues/66)
- Is 3D Secure supported? [\#64](https://github.com/solidusio/solidus_braintree/issues/64)
- Deface Override requires solidus\_frontend [\#57](https://github.com/solidusio/solidus_braintree/issues/57)
- Allow to optionally create token with `customer_id` option [\#56](https://github.com/solidusio/solidus_braintree/issues/56)
- Guest checkout tries to create a customer profile [\#37](https://github.com/solidusio/solidus_braintree/issues/37)
- Use of undefined show\_flash function in frontend [\#31](https://github.com/solidusio/solidus_braintree/issues/31)
- Select an implementation for how to store non credit card data in Solidus [\#3](https://github.com/solidusio/solidus_braintree/issues/3)

## [v1.2.0](https://github.com/solidusio/solidus_braintree/tree/v1.2.0) (2018-05-25)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v1.1.0...v1.2.0)

**Closed issues:**

- Undefined local variable or method `solidus\_paypal\_braintree'  [\#62](https://github.com/solidusio/solidus_braintree/issues/62)
- Solidus 1.3 Admin UI changes breaking New Card form [\#48](https://github.com/solidusio/solidus_braintree/issues/48)

**Merged pull requests:**

- Specify Rails versions in Gemfile [\#63](https://github.com/solidusio/solidus_braintree/pull/63) ([jhawthorn](https://github.com/jhawthorn))
- Re-record failing VCR cassettes [\#61](https://github.com/solidusio/solidus_braintree/pull/61) ([jhawthorn](https://github.com/jhawthorn))
- Revert "Ignore AVS response code in Paypal transactions." [\#60](https://github.com/solidusio/solidus_braintree/pull/60) ([jhawthorn](https://github.com/jhawthorn))
- Fixes link to Braintree v.zero docs [\#59](https://github.com/solidusio/solidus_braintree/pull/59) ([tvdeyen](https://github.com/tvdeyen))
- Download PhantomJS from github mirror [\#58](https://github.com/solidusio/solidus_braintree/pull/58) ([jhawthorn](https://github.com/jhawthorn))
- Add --ssl-protocol=any to phantomjs\_options [\#55](https://github.com/solidusio/solidus_braintree/pull/55) ([jhawthorn](https://github.com/jhawthorn))
- Fix spec failures due to missing address last\_name [\#54](https://github.com/solidusio/solidus_braintree/pull/54) ([jhawthorn](https://github.com/jhawthorn))
- Ignore AVS response code in Paypal transactions. [\#36](https://github.com/solidusio/solidus_braintree/pull/36) ([hectoregm](https://github.com/hectoregm))

## [v1.1.0](https://github.com/solidusio/solidus_braintree/tree/v1.1.0) (2016-09-22)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v1.0.0...v1.1.0)

**Merged pull requests:**

- Add support for Solidus 2.0 and Rails 5.0 [\#51](https://github.com/solidusio/solidus_braintree/pull/51) ([jhawthorn](https://github.com/jhawthorn))
- Spec to test new card [\#50](https://github.com/solidusio/solidus_braintree/pull/50) ([Murph33](https://github.com/Murph33))
- Add config to disable ship address verification [\#47](https://github.com/solidusio/solidus_braintree/pull/47) ([gmacdougall](https://github.com/gmacdougall))
- Add support for cancel [\#45](https://github.com/solidusio/solidus_braintree/pull/45) ([gmacdougall](https://github.com/gmacdougall))

## [v1.0.0](https://github.com/solidusio/solidus_braintree/tree/v1.0.0) (2016-06-24)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v0.2.1...v1.0.0)

**Closed issues:**

- Use Braintree Hosted Fields in frontend checkout [\#27](https://github.com/solidusio/solidus_braintree/issues/27)
- Not using v.zero SDK [\#14](https://github.com/solidusio/solidus_braintree/issues/14)

**Merged pull requests:**

- Change solidus dependency to components [\#44](https://github.com/solidusio/solidus_braintree/pull/44) ([gmacdougall](https://github.com/gmacdougall))
- Add placeholder text for each of the credit card inputs. [\#40](https://github.com/solidusio/solidus_braintree/pull/40) ([hectoregm](https://github.com/hectoregm))
- Get client token from braintree only in the payment page. [\#39](https://github.com/solidusio/solidus_braintree/pull/39) ([hectoregm](https://github.com/hectoregm))
- Fix tests [\#38](https://github.com/solidusio/solidus_braintree/pull/38) ([jhawthorn](https://github.com/jhawthorn))
- Ensure device\_data is added to the gateway\_options hash. [\#35](https://github.com/solidusio/solidus_braintree/pull/35) ([hectoregm](https://github.com/hectoregm))
- Paypal improvements [\#34](https://github.com/solidusio/solidus_braintree/pull/34) ([hectoregm](https://github.com/hectoregm))
- Fraud hosted fields [\#32](https://github.com/solidusio/solidus_braintree/pull/32) ([hectoregm](https://github.com/hectoregm))
- Add paypal button [\#30](https://github.com/solidusio/solidus_braintree/pull/30) ([jhawthorn](https://github.com/jhawthorn))
- Use braintree's Hosted Fields [\#29](https://github.com/solidusio/solidus_braintree/pull/29) ([jhawthorn](https://github.com/jhawthorn))
- Add feature spec for frontend checkout [\#25](https://github.com/solidusio/solidus_braintree/pull/25) ([jhawthorn](https://github.com/jhawthorn))
- Update braintree-web to 2.23.0 [\#24](https://github.com/solidusio/solidus_braintree/pull/24) ([hectoregm](https://github.com/hectoregm))
- Void payment in checkout state without authorization code [\#23](https://github.com/solidusio/solidus_braintree/pull/23) ([ericsaupe](https://github.com/ericsaupe))
- Hosted Forms Frontend [\#22](https://github.com/solidusio/solidus_braintree/pull/22) ([ericsaupe](https://github.com/ericsaupe))
- Cleanup dependencies [\#20](https://github.com/solidusio/solidus_braintree/pull/20) ([jhawthorn](https://github.com/jhawthorn))
- Remove out.json [\#19](https://github.com/solidusio/solidus_braintree/pull/19) ([jhawthorn](https://github.com/jhawthorn))
- Rebase \#9 [\#18](https://github.com/solidusio/solidus_braintree/pull/18) ([jhawthorn](https://github.com/jhawthorn))
- Rebase \#11 [\#17](https://github.com/solidusio/solidus_braintree/pull/17) ([jhawthorn](https://github.com/jhawthorn))
- MySQL support [\#16](https://github.com/solidusio/solidus_braintree/pull/16) ([jhawthorn](https://github.com/jhawthorn))
- Update travis.yml [\#15](https://github.com/solidusio/solidus_braintree/pull/15) ([jhawthorn](https://github.com/jhawthorn))

## [v0.2.1](https://github.com/solidusio/solidus_braintree/tree/v0.2.1) (2015-11-03)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v0.2.0...v0.2.1)

**Merged pull requests:**

- supply first and last name in shipping address [\#8](https://github.com/solidusio/solidus_braintree/pull/8) ([gvaughn](https://github.com/gvaughn))

## [v0.2.0](https://github.com/solidusio/solidus_braintree/tree/v0.2.0) (2015-09-17)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v0.1.5...v0.2.0)

**Merged pull requests:**

- Update braintree-web to 2.14.0 [\#7](https://github.com/solidusio/solidus_braintree/pull/7) ([kamui](https://github.com/kamui))
- Make Spree::CreditCard more flexible for handling paypal payments by … [\#6](https://github.com/solidusio/solidus_braintree/pull/6) ([allisonlarson](https://github.com/allisonlarson))

## [v0.1.5](https://github.com/solidusio/solidus_braintree/tree/v0.1.5) (2015-09-08)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v0.1.4...v0.1.5)

## [v0.1.4](https://github.com/solidusio/solidus_braintree/tree/v0.1.4) (2015-09-08)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v0.1.3...v0.1.4)

**Merged pull requests:**

- Use CARD\_TYPE\_MAPPING for setting cc\_type [\#5](https://github.com/solidusio/solidus_braintree/pull/5) ([allisonlarson](https://github.com/allisonlarson))

## [v0.1.3](https://github.com/solidusio/solidus_braintree/tree/v0.1.3) (2015-09-04)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v0.1.2...v0.1.3)

**Merged pull requests:**

- Add name presence validation on create [\#4](https://github.com/solidusio/solidus_braintree/pull/4) ([kamui](https://github.com/kamui))

## [v0.1.2](https://github.com/solidusio/solidus_braintree/tree/v0.1.2) (2015-09-04)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v0.1.1...v0.1.2)

## [v0.1.1](https://github.com/solidusio/solidus_braintree/tree/v0.1.1) (2015-09-02)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/v0.1.0...v0.1.1)

## [v0.1.0](https://github.com/solidusio/solidus_braintree/tree/v0.1.0) (2015-09-02)

[Full Changelog](https://github.com/solidusio/solidus_braintree/compare/411a93001c017d41fd545e0dc9d4edef3422759e...v0.1.0)

**Merged pull requests:**

- Provide an option for always sending the bill address [\#2](https://github.com/solidusio/solidus_braintree/pull/2) ([jordan-brough](https://github.com/jordan-brough))



\* *This Changelog was automatically generated by [github_changelog_generator](https://github.com/github-changelog-generator/github-changelog-generator)*
