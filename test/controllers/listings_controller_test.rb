require "test_helper"

class ListingsControllerTest < ActionDispatch::IntegrationTest
  test "catalog index lists name, short copy, and category" do
    get root_url
    assert_response :success

    Listing.all.each do |listing|
      assert_match listing.name, @response.body
      assert_select "a[href=?]", app_path(listing.slug)
    end
    assert_match "Productivity", @response.body
    assert_match "Media", @response.body
    assert_select ".featured", text: /Drawings that survive airplane mode/
    assert_select "a", text: "Install"
  end

  test "listing detail exposes schema fields and an Install button" do
    listing = Listing.find("squoosh")
    get app_url(listing.slug)
    assert_response :success
    assert_select "h1", listing.name
    assert_select "dd", text: /#{Regexp.escape(listing.publisher)}/
    assert_select "dd", text: /#{Regexp.escape(listing.category.titleize)}/
    assert_select "a[href=?]", listing.origin_url
    assert_select "[data-controller*=install-guide]"
    assert_select "button", text: "Install"
    assert_select ".badge", text: "Curated"
    assert_select "body", text: /On your Home Screen/, count: 0
  end

  test "listing keeps Install when the origin is flagged down" do
    get app_url("excalidraw", origin_down: 1)
    assert_response :success
    assert_select "button", text: "Install"
    assert_select ".warning-card", text: /isn’t responding/
    assert_select ".warning-card", text: /Install still works/
  end

  test "unknown slug is not found" do
    get app_url("missing-app")
    assert_response :not_found
  end

  test "forced catalog error is distinct from offline" do
    get root_url(force: "catalog")
    assert_response :service_unavailable
    assert_select "main h1", text: /Couldn’t load the catalog/
    assert_select "a", text: "Open Library"
  end
end
