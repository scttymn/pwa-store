require "test_helper"

class StorePagesControllerTest < ActionDispatch::IntegrationTest
  test "explore is discovery not a second home directory dump" do
    get explore_url
    assert_response :success
    assert_select "h1", "Explore"
    assert_select ".section-title", text: "Collections"
    assert_select "a[href=?]", app_path("excalidraw")
  end

  test "search returns honest curated hits" do
    get search_url(q: "draw")
    assert_response :success
    assert_match(/Excalidraw/, @response.body)
    assert_select ".result-count", text: /result/
  end

  test "search miss says this is not the whole web" do
    get search_url(q: "figma")
    assert_response :success
    assert_select "h2", text: /No apps match/
    assert_match(/curated catalog, not the whole web/, @response.body)
    assert_select "a", text: "Browse Explore"
    assert_select "a", text: "ink"
  end

  test "library empty state points at explore" do
    get library_url
    assert_response :success
    assert_select "h1", "Library"
    assert_select "h2", text: /Nothing on this device yet/
    assert_select "a", text: "Explore apps"
    assert_select ".section-title", text: "Get these next"
  end
end
