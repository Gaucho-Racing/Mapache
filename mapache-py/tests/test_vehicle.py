from datetime import datetime, timezone

from mapache import Marker, Session, derive_segments


class TestDeriveSegmentsNoMarkers:
    def test_single_segment(self) -> None:
        start = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        end = datetime(2026, 1, 1, 1, 0, 0, tzinfo=timezone.utc)
        session = Session(start_time=start, end_time=end)

        segments = derive_segments(session)
        assert len(segments) == 1
        assert segments[0].number == 1
        assert segments[0].start_time == start
        assert segments[0].end_time == end


class TestDeriveSegmentsOneMarker:
    def test_two_segments(self) -> None:
        start = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        mid = datetime(2026, 1, 1, 0, 30, 0, tzinfo=timezone.utc)
        end = datetime(2026, 1, 1, 1, 0, 0, tzinfo=timezone.utc)
        session = Session(start_time=start, end_time=end, markers=[Marker(timestamp=mid)])

        segments = derive_segments(session)
        assert len(segments) == 2
        assert segments[0].number == 1
        assert segments[1].number == 2
        assert segments[0].start_time == start
        assert segments[0].end_time == mid
        assert segments[1].start_time == mid
        assert segments[1].end_time == end


class TestDeriveSegmentsMultipleMarkers:
    def test_four_segments_with_sorting(self) -> None:
        start = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        m1 = datetime(2026, 1, 1, 0, 10, 0, tzinfo=timezone.utc)
        m2 = datetime(2026, 1, 1, 0, 20, 0, tzinfo=timezone.utc)
        m3 = datetime(2026, 1, 1, 0, 30, 0, tzinfo=timezone.utc)
        end = datetime(2026, 1, 1, 1, 0, 0, tzinfo=timezone.utc)

        session = Session(
            start_time=start,
            end_time=end,
            markers=[Marker(timestamp=m3), Marker(timestamp=m1), Marker(timestamp=m2)],
        )

        segments = derive_segments(session)
        assert len(segments) == 4
        for i, seg in enumerate(segments):
            assert seg.number == i + 1
        assert segments[0].start_time == start and segments[0].end_time == m1
        assert segments[1].start_time == m1 and segments[1].end_time == m2
        assert segments[2].start_time == m2 and segments[2].end_time == m3
        assert segments[3].start_time == m3 and segments[3].end_time == end
