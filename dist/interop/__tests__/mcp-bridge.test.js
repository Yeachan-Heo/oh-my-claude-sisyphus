import { describe, expect, it } from 'vitest';
import { canUseOmxDirectWriteBridge, getInteropMode, interopSendOmxMessageTool } from '../mcp-bridge.js';
describe('interop mcp bridge gating', () => {
    it('getInteropMode normalizes invalid values to off', () => {
        expect(getInteropMode({ OMX_OMC_INTEROP_MODE: 'ACTIVE' })).toBe('active');
        expect(getInteropMode({ OMX_OMC_INTEROP_MODE: 'observe' })).toBe('observe');
        expect(getInteropMode({ OMX_OMC_INTEROP_MODE: 'nonsense' })).toBe('off');
    });
    it('canUseOmxDirectWriteBridge requires all active flags', () => {
        expect(canUseOmxDirectWriteBridge({
            OMX_OMC_INTEROP_ENABLED: '1',
            OMX_OMC_INTEROP_MODE: 'active',
            OMC_INTEROP_TOOLS_ENABLED: '1',
        })).toBe(true);
        expect(canUseOmxDirectWriteBridge({
            OMX_OMC_INTEROP_ENABLED: '1',
            OMX_OMC_INTEROP_MODE: 'observe',
            OMC_INTEROP_TOOLS_ENABLED: '1',
        })).toBe(false);
        expect(canUseOmxDirectWriteBridge({
            OMX_OMC_INTEROP_ENABLED: '0',
            OMX_OMC_INTEROP_MODE: 'active',
            OMC_INTEROP_TOOLS_ENABLED: '1',
        })).toBe(false);
    });
    it('interop_send_omx_message rejects when direct write path is disabled', async () => {
        const savedEnabled = process.env.OMX_OMC_INTEROP_ENABLED;
        const savedMode = process.env.OMX_OMC_INTEROP_MODE;
        const savedTools = process.env.OMC_INTEROP_TOOLS_ENABLED;
        process.env.OMX_OMC_INTEROP_ENABLED = '0';
        process.env.OMX_OMC_INTEROP_MODE = 'off';
        process.env.OMC_INTEROP_TOOLS_ENABLED = '0';
        try {
            const response = await interopSendOmxMessageTool.handler({
                teamName: 'alpha-team',
                fromWorker: 'omc-bridge',
                toWorker: 'worker-1',
                body: 'blocked',
            });
            expect(response.isError).toBe(true);
            const text = response.content[0]?.text ?? '';
            expect(text.toLowerCase()).toContain('disabled');
        }
        finally {
            if (savedEnabled === undefined)
                delete process.env.OMX_OMC_INTEROP_ENABLED;
            else
                process.env.OMX_OMC_INTEROP_ENABLED = savedEnabled;
            if (savedMode === undefined)
                delete process.env.OMX_OMC_INTEROP_MODE;
            else
                process.env.OMX_OMC_INTEROP_MODE = savedMode;
            if (savedTools === undefined)
                delete process.env.OMC_INTEROP_TOOLS_ENABLED;
            else
                process.env.OMC_INTEROP_TOOLS_ENABLED = savedTools;
        }
    });
});
//# sourceMappingURL=mcp-bridge.test.js.map