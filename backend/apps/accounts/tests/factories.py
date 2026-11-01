from __future__ import annotations

from typing import Any

from factory.declarations import Sequence
from factory.django import DjangoModelFactory
from factory.faker import Faker
from factory.helpers import post_generation

from apps.accounts.models import User


class UserFactory(DjangoModelFactory[User]):
    class Meta:
        model = User
        django_get_or_create = ("email",)
        skip_postgeneration_save = True

    email = Sequence(lambda n: f"user{n}@example.com")
    first_name = Faker("first_name")
    last_name = Faker("last_name")
    role = User.Role.CLIENT
    is_active = True

    @post_generation
    def password(self: User, create: bool, extracted: str | None, **kwargs: Any) -> None:  # noqa: FBT001
        # نکته: factory_boy این متد را با نمونهٔ واقعی مدل (User) به‌جای نمونهٔ
        # فکتوری فراخوانی می‌کند؛ امضای self از این‌رو عمداً User است.
        self.set_password(extracted or "Str0ngP@ssword!")
        if create:
            self.save(update_fields=["password"])
