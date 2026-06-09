"""Shared Pydantic base classes and small response models.

All response schemas serialize to **camelCase** to match the frontend's
TypeScript types (``Frontend/src/types/index.ts``). FastAPI serializes
responses by alias by default, so the JSON keys come out camelCased while the
Python attributes stay snake_case.
"""
from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class Message(CamelModel):
    detail: str


class Paginated(CamelModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
