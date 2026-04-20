from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import SessionAPIViewSet

router = DefaultRouter()
router.register(r'sessions', SessionAPIViewSet, basename='session')

urlpatterns = [
    path('', include(router.urls)),
    path('sessions/<str:pk>/place_bets/', SessionAPIViewSet.as_view({'post': 'place_bets'}), name='session-place-bets'),
    path('sessions/<str:pk>/run_round/', SessionAPIViewSet.as_view({'post': 'run_round'}), name='session-run-round'),
]