"""add answerscope columns

Revision ID: b1e4c5a9d201
Revises: 9d90e4f864a4
Create Date: 2026-10-29 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'b1e4c5a9d201'
down_revision: Union[str, Sequence[str], None] = '9d90e4f864a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    tables = set(insp.get_table_names())

    if 'websites' in tables:
        cols = {c['name'] for c in insp.get_columns('websites')}
        if 'description' not in cols:
            op.add_column('websites', sa.Column('description', sa.Text(), nullable=True))
        if 'target_audience' not in cols:
            op.add_column('websites', sa.Column('target_audience', sa.String(length=500), nullable=True))

    if 'question_audit_results' in tables:
        cols = {c['name'] for c in insp.get_columns('question_audit_results')}
        if 'suggested_headings' not in cols:
            op.add_column('question_audit_results', sa.Column('suggested_headings', sa.JSON(), nullable=True))
        if 'suggested_schema_types' not in cols:
            op.add_column('question_audit_results', sa.Column('suggested_schema_types', sa.JSON(), nullable=True))
        if 'owner_confirmation_needed' not in cols:
            op.add_column('question_audit_results', sa.Column('owner_confirmation_needed', sa.Boolean(), nullable=True, server_default=sa.text('0')))

    if 'audit_recommendations' in tables:
        cols = {c['name'] for c in insp.get_columns('audit_recommendations')}
        if 'target_query' not in cols:
            op.add_column('audit_recommendations', sa.Column('target_query', sa.String(length=500), nullable=True))
        if 'identified_gap' not in cols:
            op.add_column('audit_recommendations', sa.Column('identified_gap', sa.Text(), nullable=True))
        if 'owner_confirmation_note' not in cols:
            op.add_column('audit_recommendations', sa.Column('owner_confirmation_note', sa.Text(), nullable=True))


def downgrade() -> None:
    pass
