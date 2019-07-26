import { Beam, ResourceTypes } from '../../../src/index.js'
import { PBRLighting } from '../../plugins/pbr-lighting-plugin.js'
import { createBall } from '../../utils/graphics-utils.js'
import { loadImages, loadEnvMaps } from '../../utils/image-loader.js'
import {
  rendererConfig,
  createMaterialImages,
  computeModelMat,
  computeEye,
  computeMVPMat,
  createPointLights
} from './utils.js'
const { DataBuffers, IndexBuffer, Uniforms, Textures } = ResourceTypes

const canvas = document.getElementById('gl-canvas')
canvas.height = document.body.offsetHeight
canvas.width = document.body.offsetWidth
const beam = new Beam(canvas, rendererConfig)

const plugin = beam.plugin(PBRLighting)

// Resources: data buffers and index buffer
const ball = createBall()
const dataResource = beam.resource(DataBuffers, ball.data)
const indexResource = beam.resource(IndexBuffer, ball.index)

// Resources: camera and model matrices
const baseEye = [0, 0, 10]
const center = [0, 0, 0]
const modelMat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const matrixResource = beam.resource(Uniforms, {
  u_Camera: baseEye,
  u_ModelMatrix: modelMat,
  u_MVPMatrix: computeMVPMat(modelMat, baseEye, center, canvas)
})

// Resources: point light states
const pointLightsResource = beam.resource(Uniforms, createPointLights())

// Resources: material images
const materialImagesResource = beam.resource(Textures, createMaterialImages())

// Resources: environment maps and BRDF map
let brdfResource
let envResource

// Resourecs: other options
const optionResource = beam.resource(Uniforms, {
  u_MetallicRoughnessValues: [0, 0]
})

const render = () => beam.clear().draw(
  plugin, dataResource,
  indexResource,
  brdfResource,
  envResource,
  pointLightsResource,
  materialImagesResource,
  matrixResource,
  optionResource
)

const base = '../../assets/'
Promise.all([
  loadEnvMaps(base + 'ibl/helipad'), loadImages(base + 'ibl/brdfLUT.png')
]).then(([[diffuseMaps, specularMaps], [brdf]]) => {
  brdfResource = beam.resource(Textures, { u_brdfLUT: { image: brdf } })
  envResource = beam.resource(Textures, {
    u_DiffuseEnvSampler: diffuseMaps,
    u_SpecularEnvSampler: specularMaps
  })
  render()
})

// Update Rotates
const $xRotate = document.getElementById('x-rotate')
const $yRotate = document.getElementById('y-rotate')
const $zRotate = document.getElementById('z-rotate')
const $cameraRotate = document.getElementById('camera-rotate')
const updateMats = () => {
  const [rx, ry, rz] = [$xRotate.value, $yRotate.value, $zRotate.value]
  const cameraRotate = $cameraRotate.value
  const modelMat = computeModelMat(rx, ry, rz)
  const eye = computeEye(baseEye, cameraRotate)
  matrixResource
    .set('u_ModelMatrix', modelMat)
    .set('u_Camera', eye)
    .set('u_MVPMatrix', computeMVPMat(modelMat, eye, center, canvas))
  render()
}
;[$xRotate, $yRotate, $zRotate, $cameraRotate].forEach($input => {
  $input.addEventListener('input', updateMats)
})

// Update Metalness Roughness
const $metallic = document.getElementById('metallic')
const $roughness = document.getElementById('roughness')
const updateMetalRoughness = () => {
  const mr = [$metallic.value, $roughness.value]
  optionResource.set('u_MetallicRoughnessValues', mr)
  render()
}
$metallic.addEventListener('input', updateMetalRoughness)
$roughness.addEventListener('input', updateMetalRoughness)

// Update Lights
for (let i = 0; i < 1; i++) {
  const $lightX = document.getElementById(`light-${i}-x`)
  const $lightY = document.getElementById(`light-${i}-y`)
  const $lightZ = document.getElementById(`light-${i}-z`)
  const $lightStrength = document.getElementById(`light-${i}-strength`)
  const $lightColor = document.getElementById(`light-${i}-color`)
  const updatePointLights = () => {
    const direction = [$lightX.value, $lightY.value, $lightZ.value]
    const hex = $lightColor.value
    const rgb = [
      parseInt(hex.slice(1, 3), 16) / 256,
      parseInt(hex.slice(3, 5), 16) / 256,
      parseInt(hex.slice(5, 7), 16) / 256
    ]
    pointLightsResource
      .set(`u_Lights[${i}].direction`, direction)
      .set(`u_Lights[${i}].strength`, $lightStrength.value)
      .set(`u_Lights[${i}].color]`, rgb)
    render()
  }
  ;[$lightX, $lightY, $lightZ, $lightStrength, $lightColor].forEach($input => {
    $input.addEventListener('input', updatePointLights)
  })
}
