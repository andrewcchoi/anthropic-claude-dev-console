import { routeCommand } from '../router';

describe('routeCommand', () => {
  it('routes built-in commands to local handlers', () => {
    expect(routeCommand('/help')).toEqual({
      type: 'local',
      handler: 'openHelpPanel',
    });

    expect(routeCommand('/clear')).toEqual({
      type: 'local',
      handler: 'clearChat',
    });

    expect(routeCommand('/status')).toEqual({
      type: 'local',
      handler: 'openStatusPanel',
    });

    expect(routeCommand('/cost')).toEqual({
      type: 'local',
      handler: 'scrollToUsage',
    });
  });

  it('routes skill commands to passthrough', () => {
    expect(routeCommand('/commit')).toEqual({
      type: 'passthrough',
    });

    expect(routeCommand('/brainstorm')).toEqual({
      type: 'passthrough',
    });

    expect(routeCommand('/review')).toEqual({
      type: 'passthrough',
    });
  });

  it('routes unknown slash commands to passthrough', () => {
    expect(routeCommand('/unknown-command')).toEqual({
      type: 'passthrough',
    });

    expect(routeCommand('/custom-plugin-cmd')).toEqual({
      type: 'passthrough',
    });
  });

  it('routes regular messages to passthrough', () => {
    expect(routeCommand('Hello, Claude!')).toEqual({
      type: 'passthrough',
    });

    expect(routeCommand('Please help me with this code')).toEqual({
      type: 'passthrough',
    });
  });

  it('handles whitespace correctly', () => {
    expect(routeCommand('  /help  ')).toEqual({
      type: 'local',
      handler: 'openHelpPanel',
    });

    expect(routeCommand('  /commit  ')).toEqual({
      type: 'passthrough',
    });
  });
});
