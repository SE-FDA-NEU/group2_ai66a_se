def test_public_health_returns_200_when_db_and_redis_are_ok(client, db_session, redis_client):
    db_session.execute.return_value = 1
    redis_client.ping.return_value = True

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "connected",
        "redis": "connected",
    }
    db_session.execute.assert_awaited_once()
    redis_client.ping.assert_awaited_once()


def test_public_health_returns_503_when_database_fails(client, db_session, redis_client):
    db_session.execute.side_effect = RuntimeError("db down")
    redis_client.ping.return_value = True

    response = client.get("/health")

    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "DATABASE_ERROR"


def test_public_health_returns_503_when_redis_fails(client, db_session, redis_client):
    db_session.execute.return_value = 1
    redis_client.ping.side_effect = RuntimeError("redis down")

    response = client.get("/health")

    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "REDIS_ERROR"
