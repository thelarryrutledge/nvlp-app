#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 NVLP Monorepo Dependency Analysis\n');

// Find all packages and apps
function findWorkspacePackages() {
  const workspaces = JSON.parse(fs.readFileSync('package.json', 'utf8')).workspaces || [];
  const packages = [];
  
  workspaces.forEach(workspace => {
    const basePath = workspace.replace('/*', '');
    if (fs.existsSync(basePath)) {
      const items = fs.readdirSync(basePath);
      items.forEach(item => {
        const fullPath = path.join(basePath, item);
        const packageJsonPath = path.join(fullPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          packages.push({
            name: packageJson.name,
            path: fullPath,
            type: basePath === 'packages' ? 'package' : 'app',
            dependencies: {
              ...packageJson.dependencies || {},
              ...packageJson.devDependencies || {}
            }
          });
        }
      });
    }
  });
  
  return packages;
}

// Analyze workspace dependencies
function analyzeWorkspaceDependencies(packages) {
  const workspaceDeps = {};
  const buildOrder = [];
  const processed = new Set();
  
  packages.forEach(pkg => {
    workspaceDeps[pkg.name] = [];
    Object.keys(pkg.dependencies).forEach(dep => {
      const depPackage = packages.find(p => p.name === dep);
      if (depPackage) {
        workspaceDeps[pkg.name].push(dep);
      }
    });
  });
  
  // Topological sort for build order
  function addToBuildOrder(pkgName) {
    if (processed.has(pkgName)) return;
    
    const deps = workspaceDeps[pkgName] || [];
    deps.forEach(dep => {
      if (!processed.has(dep)) {
        addToBuildOrder(dep);
      }
    });
    
    buildOrder.push(pkgName);
    processed.add(pkgName);
  }
  
  packages.forEach(pkg => addToBuildOrder(pkg.name));
  
  return { workspaceDeps, buildOrder };
}

// Visualize dependency graph
function visualizeDependencies(packages, workspaceDeps, buildOrder) {
  console.log('📦 Package Overview:');
  console.log('==================');
  
  packages.forEach(pkg => {
    const icon = pkg.type === 'package' ? '📚' : '🚀';
    console.log(`${icon} ${pkg.name} (${pkg.type})`);
    console.log(`   Path: ${pkg.path}`);
    
    const workspaceDepsForPkg = workspaceDeps[pkg.name] || [];
    if (workspaceDepsForPkg.length > 0) {
      console.log(`   Depends on: ${workspaceDepsForPkg.join(', ')}`);
    } else {
      console.log(`   No workspace dependencies`);
    }
    console.log('');
  });
  
  console.log('🔄 Build Order (Dependency-Aware):');
  console.log('===================================');
  
  buildOrder.forEach((pkgName, index) => {
    const pkg = packages.find(p => p.name === pkgName);
    const icon = pkg.type === 'package' ? '📚' : '🚀';
    console.log(`${index + 1}. ${icon} ${pkgName}`);
  });
  
  console.log('');
  
  // Dependency graph visualization
  console.log('📊 Dependency Graph:');
  console.log('===================');
  
  const levels = {};
  const getLevelForPackage = (pkgName, visited = new Set()) => {
    if (visited.has(pkgName)) return 0; // Circular dependency fallback
    if (levels[pkgName] !== undefined) return levels[pkgName];
    
    visited.add(pkgName);
    const deps = workspaceDeps[pkgName] || [];
    
    if (deps.length === 0) {
      levels[pkgName] = 0;
    } else {
      const depLevels = deps.map(dep => getLevelForPackage(dep, new Set(visited)));
      levels[pkgName] = Math.max(...depLevels) + 1;
    }
    
    visited.delete(pkgName);
    return levels[pkgName];
  };
  
  packages.forEach(pkg => getLevelForPackage(pkg.name));
  
  const maxLevel = Math.max(...Object.values(levels));
  for (let level = 0; level <= maxLevel; level++) {
    console.log(`Level ${level}:`);
    Object.entries(levels)
      .filter(([, l]) => l === level)
      .forEach(([pkgName]) => {
        const pkg = packages.find(p => p.name === pkgName);
        const icon = pkg.type === 'package' ? '📚' : '🚀';
        console.log(`  ${icon} ${pkgName}`);
      });
    if (level < maxLevel) console.log('  ↓');
  }
}

// Check for circular dependencies
function checkCircularDependencies(workspaceDeps) {
  console.log('\n🔍 Circular Dependency Check:');
  console.log('==============================');
  
  const visited = new Set();
  const recursionStack = new Set();
  const circularDeps = [];
  
  function hasCycle(node, path = []) {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat(node);
      circularDeps.push(cycle);
      return true;
    }
    
    if (visited.has(node)) return false;
    
    visited.add(node);
    recursionStack.add(node);
    path.push(node);
    
    const deps = workspaceDeps[node] || [];
    for (const dep of deps) {
      if (hasCycle(dep, [...path])) {
        recursionStack.delete(node);
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  Object.keys(workspaceDeps).forEach(node => {
    if (!visited.has(node)) {
      hasCycle(node);
    }
  });
  
  if (circularDeps.length === 0) {
    console.log('✅ No circular dependencies found!');
  } else {
    console.log('❌ Circular dependencies detected:');
    circularDeps.forEach((cycle, index) => {
      console.log(`  ${index + 1}. ${cycle.join(' → ')}`);
    });
  }
}

// Performance recommendations
function generateRecommendations(packages, workspaceDeps, buildOrder) {
  console.log('\n💡 Build Performance Recommendations:');
  console.log('=====================================');
  
  // Find packages that can build in parallel
  const levels = {};
  packages.forEach(pkg => {
    const deps = workspaceDeps[pkg.name] || [];
    if (deps.length === 0) {
      levels[pkg.name] = 0;
    } else {
      const depLevels = deps.map(dep => levels[dep] || 0);
      levels[pkg.name] = Math.max(...depLevels) + 1;
    }
  });
  
  const parallelGroups = {};
  Object.entries(levels).forEach(([pkg, level]) => {
    if (!parallelGroups[level]) parallelGroups[level] = [];
    parallelGroups[level].push(pkg);
  });
  
  console.log('Parallel build opportunities:');
  Object.entries(parallelGroups).forEach(([level, pkgs]) => {
    if (pkgs.length > 1) {
      console.log(`  Level ${level}: ${pkgs.join(', ')} can build in parallel`);
    }
  });
  
  // Check for heavy dependencies
  const depCounts = {};
  Object.values(workspaceDeps).forEach(deps => {
    deps.forEach(dep => {
      depCounts[dep] = (depCounts[dep] || 0) + 1;
    });
  });
  
  console.log('\nMost depended-upon packages (potential bottlenecks):');
  Object.entries(depCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .forEach(([pkg, count]) => {
      console.log(`  📦 ${pkg}: ${count} dependents`);
    });
  
  // Recommend caching strategy
  console.log('\n🎯 Caching Strategy:');
  console.log('- Enable Turbo cache for packages with heavy builds');
  console.log('- Cache test results for packages with extensive test suites');
  console.log('- Consider remote caching for CI/CD environments');
}

// Main execution
try {
  const packages = findWorkspacePackages();
  const { workspaceDeps, buildOrder } = analyzeWorkspaceDependencies(packages);
  
  visualizeDependencies(packages, workspaceDeps, buildOrder);
  checkCircularDependencies(workspaceDeps);
  generateRecommendations(packages, workspaceDeps, buildOrder);
  
  console.log('\n✨ Analysis complete!');
  console.log('\nThis analysis helps optimize your Turborepo configuration and build pipeline.');
  
} catch (error) {
  console.error('❌ Error analyzing dependencies:', error.message);
  process.exit(1);
}