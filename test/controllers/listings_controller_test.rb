require "test_helper"

class ListingsControllerTest < ActionDispatch::IntegrationTest
  test "catalog index lists name, short copy, and category" do
    get root_url
    assert_response :success

    Listing.all.each do |listing|
      assert_select "li", text: /#{Regexp.escape(listing.name)}/
      assert_select "li", text: /#{Regexp.escape(listing.short_copy)}/
      assert_select "li", text: /#{Regexp.escape(listing.category)}/
      assert_select "a[href=?]", app_path(listing.slug)
    end
  end

  test "listing detail exposes schema fields and an Install button" do
    listing = Listing.find("squoosh")
    get app_url(listing.slug)
    assert_response :success
    assert_select "h1", listing.name
    assert_select "dd", text: /#{Regexp.escape(listing.publisher)}/
    assert_select "dd", text: /#{Regexp.escape(listing.category)}/
    assert_select "a[href=?]", listing.origin_url
    assert_select "[data-controller=install-guide]"
    assert_select "button", text: "Install"
  end

  test "unknown slug is not found" do
    get app_url("missing-app")
    assert_response :not_found
  end
end
