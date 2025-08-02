import { SupabaseService } from '../config/supabase';

export interface PoolStatsRouteHandlers {
  getPoolStats: () => Promise<Response>;
  getPoolHealth: () => Promise<Response>;
}

/**
 * Create route handlers for connection pool monitoring
 */
export function createPoolStatsRoutes(supabaseService: SupabaseService): PoolStatsRouteHandlers {
  return {
    async getPoolStats(): Promise<Response> {
      try {
        const stats = supabaseService.getPoolStats();
        
        return new Response(JSON.stringify({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: (error as Error).message,
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },

    async getPoolHealth(): Promise<Response> {
      try {
        const health = await supabaseService.healthCheck();
        
        const overallHealthy = health.main.healthy && 
          (health.admin ? health.admin.healthy : true);
        
        return new Response(JSON.stringify({
          success: true,
          healthy: overallHealthy,
          data: health,
          timestamp: new Date().toISOString(),
        }), {
          status: overallHealthy ? 200 : 503,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          healthy: false,
          error: (error as Error).message,
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },
  };
}

/**
 * Middleware to add pool statistics to response headers
 */
export function addPoolStatsHeaders(supabaseService: SupabaseService) {
  return (response: Response): Response => {
    const stats = supabaseService.getPoolStats();
    
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Pool-Total-Connections', String(stats.main.totalConnections));
    newHeaders.set('X-Pool-Active-Connections', String(stats.main.activeConnections));
    newHeaders.set('X-Pool-Idle-Connections', String(stats.main.idleConnections));
    newHeaders.set('X-Pool-Waiting-Requests', String(stats.main.waitingForConnection));
    
    if (stats.admin) {
      newHeaders.set('X-Admin-Pool-Total-Connections', String(stats.admin.totalConnections));
      newHeaders.set('X-Admin-Pool-Active-Connections', String(stats.admin.activeConnections));
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}