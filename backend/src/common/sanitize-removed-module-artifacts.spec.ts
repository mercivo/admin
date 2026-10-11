import { sanitizeRemovedModuleArtifacts } from './sanitize-removed-module-artifacts';

describe('sanitizeRemovedModuleArtifacts', () => {
  it('removes assistant sections and agent configuration recursively', () => {
    expect(sanitizeRemovedModuleArtifacts({
      agent: { id: 'agent-1' },
      sections: [
        { id: 'hero', type: 'hero', title: 'Welcome', position: 'center' },
        { id: 'assistant', type: 'assistant', agentId: 'agent-1', welcome: 'hello', quickReplies: ['help'], position: 'right' },
      ],
      nested: { agentId: 'agent-2', welcome: 'hello', quickReplies: [] },
    })).toEqual({
      sections: [{ id: 'hero', type: 'hero', title: 'Welcome', position: 'center' }],
      nested: {},
    });
  });
});
