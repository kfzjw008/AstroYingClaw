# -*- coding: utf-8 -*-
"""
AstroGuide 自动化流水线模块

提供天文教学自动化流水线的定义、验证和执行功能
"""

from .schema import (
    Pipeline,
    PipelineStep,
    PipelineMetadata,
    PipelineConfig,
    ActionType,
    create_quick_pipeline
)

from .runner import (
    PipelineRunner,
    run_pipeline_from_file
)

__all__ = [
    # Schema
    'Pipeline',
    'PipelineStep',
    'PipelineMetadata',
    'PipelineConfig',
    'ActionType',
    'create_quick_pipeline',
    # Runner
    'PipelineRunner',
    'run_pipeline_from_file',
]
