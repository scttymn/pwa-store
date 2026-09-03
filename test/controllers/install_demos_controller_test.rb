require "test_helper"

class InstallDemosControllerTest < ActionDispatch::IntegrationTest
  test "install-demo dumps the detection spike" do
    get install_demo_url
    assert_response :success
    assert_select "h1", /Install detection spike/
    assert_select "[data-install-guide-target=output]"
    assert_select "button", text: "startInstallGuide()"
  end

  test "spike is an alias for the same page" do
    get "/spike"
    assert_response :success
    assert_select "[data-controller=install-guide]"
  end

  test "store manifest and service worker are routed" do
    get pwa_manifest_url(format: :json)
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "PWA Store", body["name"]
    assert_equal "standalone", body["display"]

    get "/service-worker.js"
    assert_response :success
    assert_match(/addEventListener\("install"/, response.body)
  end
end
