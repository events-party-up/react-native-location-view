import React from 'react';
import PropTypes from 'prop-types';
import { TextInput, View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AutoCompleteListView from './AutoCompleteListView';
import axios from 'axios';
import Events from 'react-native-simple-events';
import debounce from '../utils/debounce';

const CancelToken = axios.CancelToken;

export default class AutoCompleteInput extends React.Component {
  static propTypes = {
    mobileServer: PropTypes.string.isRequired,
    debounceDuration: PropTypes.number.isRequired,
    components: PropTypes.arrayOf(PropTypes.string),
  };

  static defaultProps = {
    components: [],
  };

  constructor(props) {
    super(props);
    this._request = debounce(this._request.bind(this), this.props.debounceDuration);
  }

  componentWillUnmount() {
    this._abortRequest();
  }

  state = {
    predictions: [],
    loading: false,
    inFocus: false,
  };

  _abortRequest = () => {
    if (this.source) {
      this.source.cancel('Operation canceled by the user.');
    }
  };

  fetchAddressForLocation = location => {
    this.setState({ loading: true, predictions: [] });
    let { latitude, longitude } = location;
    this.source = CancelToken.source();
    axios
      .post(this.props.mobileServer + '/geocode', {
        latitude: latitude,
        longitude: longitude,
      }, {
        cancelToken: this.source.token,
      })
      .then(({ data }) => {
        this.setState({ loading: false });
        let { results } = data;
        if (results.length > 0) {
          let { formatted_address } = results[0];
          this.setState({ text: formatted_address });
        }
      })
      .catch ( e =>
        console.log(e)
      );
  };

  _request = text => {
    this._abortRequest();
    if (text.length >= 3) {
      this.source = CancelToken.source();
      axios
        .post(this.props.mobileServer + '/autocomplete', {
          input: text,
          components: this.props.components.join('|'),
        }, {
          cancelToken: this.source.token,
        })
        .then(({ data }) => {
          let { predictions } = data ? data : [];
          this.setState({ predictions });
        })
        .catch ( e =>
          console.log(e)
        );
    } else {
      this.setState({ predictions: [] });
    }
  };

  _onChangeText = text => {
    this._request(text);
    this.setState({ text });
  };

  _onFocus = () => {
    this._abortRequest();
    this.setState({ loading: false, inFocus: true });
    Events.trigger('InputFocus');
  };

  _onBlur = () => {
    this.setState({ inFocus: false });
    Events.trigger('InputBlur');
  };

  blur = () => {
    this._input.blur();
  };

  _onPressClear = () => {
    this.setState({ text: '', predictions: [] });
  };

  _getClearButton = () =>
    this.state.inFocus ? (
      <TouchableOpacity style={styles.btn} onPress={this._onPressClear}>
        <MaterialIcons name={'clear'} size={20} />
      </TouchableOpacity>
    ) : null;

  getAddress = () => (this.state.loading ? '' : this.state.text);

  render() {
    return (
      <Animated.View style={this.props.style}>
        <View style={styles.textInputContainer} elevation={5}>
          <TextInput
            ref={input => (this._input = input)}
            value={this.state.loading ? 'Loading...' : this.state.text}
            style={styles.textInput}
            underlineColorAndroid={'transparent'}
            placeholder={'Search'}
            onFocus={this._onFocus}
            onBlur={this._onBlur}
            onChangeText={this._onChangeText}
            outlineProvider="bounds"
            autoCorrect={false}
            spellCheck={false}
          />
          {this._getClearButton()}
        </View>
        <View style={styles.listViewContainer}>
          <AutoCompleteListView predictions={this.state.predictions} />
        </View>
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  textInputContainer: {
    flexDirection: 'row',
    height: 40,
    zIndex: 99,
    paddingLeft: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 2,
    shadowOpacity: 0.24,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: '#404752',
  },
  btn: {
    width: 30,
    height: 30,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listViewContainer: {
    paddingLeft: 3,
    paddingRight: 3,
    paddingBottom: 3,
  },
});
