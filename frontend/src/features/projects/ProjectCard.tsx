import React, { useState } from 'react';
import {
  Card, CardContent, CardActions, Typography, IconButton, Box, Tooltip, Chip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Folder as FolderIcon } from '@mui/icons-material';
import { Project } from '../../api/types';
import { useNavigate } from 'react-router-dom';

interface Props {
  project: Project;
  onDelete: (project: Project) => void;
  onEdit: (project: Project) => void;
  isOwner: boolean;
}

const ProjectCard = ({ project, onDelete, onEdit, isOwner }: Props) => {
  const navigate = useNavigate();
  return (
    <Card
      variant="outlined"
      sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 }, transition: 'box-shadow 0.2s' }}
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <FolderIcon color="primary" />
          <Typography variant="h6" fontWeight={600} noWrap>
            {project.name}
          </Typography>
          {isOwner && <Chip label="Owner" size="small" color="primary" variant="outlined" />}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
          {project.description || 'No description'}
        </Typography>
        <Typography variant="caption" color="text.disabled" mt={1} display="block">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </Typography>
      </CardContent>
      {isOwner && (
        <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Edit project">
            <IconButton size="small" onClick={() => onEdit(project)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete project">
            <IconButton size="small" color="error" onClick={() => onDelete(project)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardActions>
      )}
    </Card>
  );
};

export default ProjectCard;

