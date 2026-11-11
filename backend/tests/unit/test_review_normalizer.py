from app.helper.review_normalizer import cached_review_page, normalize_review


def test_provider_fields_and_html_entities():
    review = normalize_review({"review_id": "R1", "review_author": "A &amp; B", "review_comment": "Works", "review_star_rating": "4", "is_verified_purchase": True, "reviewed_product_variant": {"Color": "Blue"}})
    assert review["author"] == "A & B"
    assert review["text"] == "Works"
    assert review["rating"] == 4
    assert review["verified_purchase"] is True
    assert review["variant"] == "Color: Blue"


def test_pagination_and_filter_apply_to_entire_cache():
    reviews = [{"id": i, "rating": (i % 5) + 1, "text": str(i)} for i in range(51)]
    first = cached_review_page(reviews, 1, None)
    second = cached_review_page(reviews, 2, None)
    assert len(first["reviews"]) == len(second["reviews"]) == 10
    assert first["reviews"][0]["id"] != second["reviews"][0]["id"]
    filtered = cached_review_page(reviews, 1, 1)
    assert len(filtered["reviews"]) == 10
    assert filtered["has_more"] is True
    assert all(r["rating"] == 1 for r in filtered["reviews"])
    assert len(cached_review_page(reviews, 2, 1)["reviews"]) == 1
    assert cached_review_page(reviews, 2, 1)["has_more"] is False


def test_bad_rating_does_not_produce_invalid_stars():
    assert normalize_review({"rating": "unknown"})["rating"] is None
    assert cached_review_page([], 1, 5)["reviews"] == []
