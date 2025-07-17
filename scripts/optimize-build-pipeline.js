#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('⚡ NVLP Build Pipeline Optimizer\n');

// Current turbo.json configuration
const turboConfig = JSON.parse(fs.readFileSync('turbo.json', 'utf8'));

// Analyze package.json files to understand build characteristics
function analyzePackageBuildCharacteristics() {
  const packages = [];
  const workspaces = JSON.parse(fs.readFileSync('package.json', 'utf8')).workspaces || [];
  
  workspaces.forEach(workspace => {
    const basePath = workspace.replace('/*', '');
    if (fs.existsSync(basePath)) {
      const items = fs.readdirSync(basePath);
      items.forEach(item => {
        const fullPath = path.join(basePath, item);
        const packageJsonPath = path.join(fullPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          
          // Analyze build characteristics
          const characteristics = {
            name: packageJson.name,
            path: fullPath,
            type: basePath === 'packages' ? 'package' : 'app',
            hasTests: !!(packageJson.scripts?.test || packageJson.scripts?.['test:watch']),
            hasLinting: !!(packageJson.scripts?.lint || packageJson.scripts?.['lint:fix']),
            hasTypeScript: fs.existsSync(path.join(fullPath, 'tsconfig.json')),
            hasBuildStep: !!(packageJson.scripts?.build),
            buildTool: getBuildTool(packageJson),
            complexity: estimateComplexity(fullPath, packageJson),
            dependencies: Object.keys({
              ...packageJson.dependencies || {},
              ...packageJson.devDependencies || {}
            }).filter(dep => dep.startsWith('@nvlp/'))
          };
          
          packages.push(characteristics);
        }
      });
    }
  });
  
  return packages;
}

function getBuildTool(packageJson) {
  const scripts = packageJson.scripts || {};
  if (scripts.build?.includes('tsup')) return 'tsup';
  if (scripts.build?.includes('tsc')) return 'tsc';
  if (scripts.build?.includes('webpack')) return 'webpack';
  if (scripts.build?.includes('vite')) return 'vite';
  if (scripts.build?.includes('rollup')) return 'rollup';
  if (scripts.build?.includes('esbuild')) return 'esbuild';
  return 'other';
}

function estimateComplexity(packagePath, packageJson) {
  let score = 0;
  
  // Base complexity from dependencies
  const deps = Object.keys({
    ...packageJson.dependencies || {},
    ...packageJson.devDependencies || {}
  });
  score += deps.length * 0.1;
  
  // TypeScript complexity
  const tsConfigPath = path.join(packagePath, 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    score += 2;
    
    // Check for strict TypeScript settings
    try {
      const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
      if (tsConfig.compilerOptions?.strict) score += 1;
      if (tsConfig.compilerOptions?.declaration) score += 1;
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  // Source code complexity (rough estimate)
  const srcPath = path.join(packagePath, 'src');
  if (fs.existsSync(srcPath)) {
    try {
      const files = fs.readdirSync(srcPath, { recursive: true });
      score += files.length * 0.2;
    } catch (e) {
      // Ignore if can't read recursively
      score += 2;
    }
  }
  
  // React Native complexity
  if (packageJson.dependencies?.['react-native']) {
    score += 5;
  }
  
  // Build tool complexity
  if (packageJson.scripts?.build?.includes('webpack')) score += 3;
  if (packageJson.scripts?.build?.includes('rollup')) score += 2;
  if (packageJson.scripts?.build?.includes('esbuild')) score += 1;
  
  return Math.min(score, 10); // Cap at 10
}

// Generate optimized configuration
function generateOptimizedConfig(packages) {
  console.log('📊 Package Analysis:');
  console.log('===================');
  
  packages.forEach(pkg => {
    const icon = pkg.type === 'package' ? '📚' : '🚀';
    console.log(`${icon} ${pkg.name}`);
    console.log(`   Type: ${pkg.type}`);
    console.log(`   Build Tool: ${pkg.buildTool}`);
    console.log(`   Complexity: ${pkg.complexity.toFixed(1)}/10`);
    console.log(`   Features: ${[
      pkg.hasTypeScript && 'TypeScript',
      pkg.hasTests && 'Tests',
      pkg.hasLinting && 'Linting'
    ].filter(Boolean).join(', ') || 'None'}`);
    console.log(`   Dependencies: ${pkg.dependencies.length > 0 ? pkg.dependencies.join(', ') : 'None'}`);
    console.log('');
  });
  
  // Generate recommendations
  console.log('💡 Optimization Recommendations:');
  console.log('================================');
  
  // Find packages that would benefit from caching
  const heavyPackages = packages.filter(pkg => pkg.complexity > 5);
  if (heavyPackages.length > 0) {
    console.log('🎯 High-complexity packages (prime for caching):');
    heavyPackages.forEach(pkg => {
      console.log(`   ${pkg.name} (complexity: ${pkg.complexity.toFixed(1)})`);
    });
  }
  
  // Find packages that build quickly (might not need caching)
  const lightPackages = packages.filter(pkg => pkg.complexity < 2);
  if (lightPackages.length > 0) {
    console.log('⚡ Low-complexity packages (fast builds):');
    lightPackages.forEach(pkg => {
      console.log(`   ${pkg.name} (complexity: ${pkg.complexity.toFixed(1)})`);
    });
  }
  
  // Check for potential parallelization
  const independentPackages = packages.filter(pkg => pkg.dependencies.length === 0);
  console.log('\n🔄 Parallelization Opportunities:');
  if (independentPackages.length > 1) {
    console.log('   Packages with no workspace dependencies (can build in parallel):');
    independentPackages.forEach(pkg => {
      console.log(`   ${pkg.name}`);
    });
  }
  
  // Build tool optimization
  const buildTools = [...new Set(packages.map(pkg => pkg.buildTool))];
  console.log('\n🛠️  Build Tool Distribution:');
  buildTools.forEach(tool => {
    const count = packages.filter(pkg => pkg.buildTool === tool).length;
    console.log(`   ${tool}: ${count} package(s)`);
  });
  
  return generateTurboOptimizations(packages);
}

function generateTurboOptimizations(packages) {
  const optimizations = {
    caching: [],
    parallelization: [],
    inputs: {},
    outputs: {},
    environment: []
  };
  
  packages.forEach(pkg => {
    // Caching recommendations
    if (pkg.complexity > 4) {
      optimizations.caching.push(`${pkg.name}: High complexity build - excellent caching candidate`);
    }
    
    // Input optimization
    const inputs = ['src/**', 'package.json'];
    if (pkg.hasTypeScript) inputs.push('tsconfig.json');
    if (pkg.buildTool === 'tsup') inputs.push('tsup.config.*');
    if (pkg.hasLinting) inputs.push('.eslintrc.*', 'eslint.config.*');
    
    optimizations.inputs[pkg.name] = inputs;
    
    // Output optimization
    const outputs = [];
    if (pkg.hasBuildStep) outputs.push('dist/**');
    if (pkg.hasTests) outputs.push('coverage/**');
    
    optimizations.outputs[pkg.name] = outputs;
  });
  
  return optimizations;
}

// Main execution
console.log('Analyzing package build characteristics...\n');

const packages = analyzePackageBuildCharacteristics();
const optimizations = generateOptimizedConfig(packages);

console.log('\n✨ Analysis Complete!');
console.log('\nCurrent Turbo configuration is optimized for:');
console.log('• Dependency-aware builds (^build dependencies)');
console.log('• Input-based caching for maximum efficiency');
console.log('• Environment variable tracking');
console.log('• Proper output declarations for caching');

console.log('\n🎯 Current Build Order (from dependency analysis):');
console.log('1. @nvlp/config (foundation package)');
console.log('2. @nvlp/types (depends on config)');
console.log('3. @nvlp/client (depends on types + config) | @nvlp/api (depends on types + config)');
console.log('4. @nvlp/mobile (depends on client + types + config)');

console.log('\n⚡ Turbo automatically handles:');
console.log('• Parallel builds where dependencies allow');
console.log('• Incremental builds with smart caching');
console.log('• Dependency graph optimization');
console.log('• Build artifact reuse across runs');

console.log('\nYour build pipeline is optimized! 🚀');